using System.Security.Claims;
using System.Text.Json;
using System.Net.Http.Headers;
using MediQuest.Api.Data;
using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;

namespace MediQuest.Api.Controllers;

[ApiController]
[Route("api/epic")]
public class EpicController : ControllerBase
{
    public record EpicCallbackRequest(string Code, string State);

    private readonly EpicSmartService _epicSmartService;
    private readonly AppDbContext _dbContext;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;
    private readonly ILogger<EpicController> _logger;

    public EpicController(
        EpicSmartService epicSmartService,
        AppDbContext dbContext,
        HttpClient httpClient,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<EpicController> logger)
    {
        _epicSmartService = epicSmartService;
        _dbContext = dbContext;
        _httpClient = httpClient;
        _configuration = configuration;
        _environment = environment;
        _logger = logger;
    }

    [Authorize]
    [HttpGet("authorize")]
    public async Task<ActionResult> AuthorizeEpic()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var (authorizationEndpoint, _) = await _epicSmartService.DiscoverAsync();
        var state = Guid.NewGuid().ToString("N");
        var (verifier, challenge) = _epicSmartService.GeneratePkce();
        var url = _epicSmartService.BuildAuthorizeUrl(userId, state, verifier, challenge, authorizationEndpoint);
        return Ok(new { authorizeUrl = url, state });
    }

    [HttpGet("callback")]
    public async Task<ActionResult> Callback([FromQuery] string code, [FromQuery] string state)
    {
        var result = await _epicSmartService.HandleCallbackAsync(code, state);
        if (!result.Success) return BadRequest(new { success = false, message = result.Message });
        return Ok(new { success = true });
    }

    [Authorize]
    [HttpPost("callback")]
    public async Task<ActionResult> CallbackPost([FromBody] EpicCallbackRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.State))
        {
            return BadRequest(new { success = false, message = "code and state are required." });
        }
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var result = await _epicSmartService.HandleCallbackAsync(request.Code, request.State, userId);
        if (!result.Success)
        {
            var tokenExchangeHint = result.TokenStatusCode == 400
                ? "This usually means the authorization code was expired/reused, the redirect URI does not match, or the PKCE/state was created under a different MediQuest login. Start a fresh Connect Epic flow."
                : null;
            return BadRequest(new
            {
                success = false,
                message = result.Message,
                hint = tokenExchangeHint,
                diagnostics = _environment.IsDevelopment()
                    ? new Dictionary<string, object?>(result.Diagnostics ?? new Dictionary<string, object?>())
                    {
                        ["environmentName"] = _environment.EnvironmentName
                    }
                    : null
            });
        }
        return Ok(new { success = true, message = result.Message });
    }

    [Authorize]
    [HttpGet("status")]
    public async Task<ActionResult> Status()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var conn = await _dbContext.EpicConnections.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
        return Ok(new { connected = conn is not null, expiresAt = conn?.ExpiresAt, patientId = conn?.PatientId, fhirBaseUrl = conn?.FhirBaseUrl });
    }

    [Authorize]
    [HttpPost("disconnect")]
    public async Task<ActionResult> Disconnect()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var conn = await _dbContext.EpicConnections.FirstOrDefaultAsync(x => x.UserId == userId);
        if (conn is not null)
        {
            _dbContext.EpicConnections.Remove(conn);
            await _dbContext.SaveChangesAsync();
        }
        return NoContent();
    }

    [Authorize]
    [HttpPost("import/medications")]
    public async Task<ActionResult> ImportMedications()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var conn = await _dbContext.EpicConnections.FirstOrDefaultAsync(x => x.UserId == userId);
        if (conn is null || string.IsNullOrWhiteSpace(conn.PatientId)) return BadRequest(new { message = "Epic connection with patient context is required." });
        if (conn.ExpiresAt <= DateTime.UtcNow) return BadRequest(new { message = "Epic connection expired, reconnect Epic." });

        var attemptedSources = new List<string>();
        var primaryResult = await ImportFromSource(userId, conn, "MedicationRequest");
        attemptedSources.Add("MedicationRequest");
        if (primaryResult.ErrorResult is not null) return primaryResult.ErrorResult;

        var finalResult = primaryResult;
        var sourceSkippedReasons = new Dictionary<string, string>();
        var enableMedicationStatementFallback = _configuration.GetValue<bool>("Epic:EnableMedicationStatementFallback");
        if (!enableMedicationStatementFallback)
        {
            sourceSkippedReasons["MedicationStatement"] = "Skipped: MedicationStatement fallback is disabled for R4 by default.";
        }
        else if (primaryResult.ImportedCount == 0 && primaryResult.UpdatedCount == 0)
        {
            var fallbackResult = await ImportFromSource(userId, conn, "MedicationStatement");
            attemptedSources.Add("MedicationStatement");
            if (fallbackResult.ErrorResult is not null)
            {
                if (fallbackResult.IsUnsupportedSource)
                {
                    sourceSkippedReasons["MedicationStatement"] = "Skipped: source not supported by this Epic app.";
                }
                else
                {
                    return fallbackResult.ErrorResult;
                }
            }
            else
            {
                finalResult = fallbackResult;
            }
        }

        var totalImportedOrUpdated = finalResult.ImportedCount + finalResult.UpdatedCount;
        var fallbackUsed = false;
        string? fallbackReason = null;
        if (totalImportedOrUpdated == 0 && _environment.IsDevelopment() && ShouldUseDevelopmentFallback(finalResult.Diagnostics))
        {
            var fallbackResult = await ImportDevelopmentFallbackMedications(userId);
            finalResult = fallbackResult;
            fallbackUsed = true;
            fallbackReason = "Epic MedicationRequest sandbox result was suppressed or unauthorized for medication resources.";
            attemptedSources.Add("EpicSandboxDemoFallback");
        }

        await _dbContext.SaveChangesAsync();
        totalImportedOrUpdated = finalResult.ImportedCount + finalResult.UpdatedCount;
        return Ok(new
        {
            importedCount = finalResult.ImportedCount,
            updatedCount = finalResult.UpdatedCount,
            skippedCount = finalResult.SkippedCount,
            totalEntryCount = finalResult.TotalEntryCount,
            sourceUsed = totalImportedOrUpdated > 0 ? finalResult.SourceName : "None",
            attemptedSources,
            sourceSkippedReasons,
            message = fallbackUsed
                ? "Epic sandbox suppressed medication results, so demo medications were imported."
                : totalImportedOrUpdated == 0
                ? "Epic MedicationRequest returned successfully, but no usable medications were found."
                : $"Epic medication import completed using {finalResult.SourceName}. Imported {finalResult.ImportedCount}, updated {finalResult.UpdatedCount}, skipped {finalResult.SkippedCount}.",
            medications = finalResult.Imported,
            fallbackUsed,
            fallbackReason,
            realEpicAttempted = true,
            diagnostics = _environment.IsDevelopment() ? finalResult.Diagnostics : null
        });
    }

    private sealed record ImportSourceResult(string SourceName, int ImportedCount, int UpdatedCount, int SkippedCount, int TotalEntryCount, List<object> Imported, object? Diagnostics = null, ActionResult? ErrorResult = null, bool IsUnsupportedSource = false);

    private bool ShouldUseDevelopmentFallback(object? diagnosticsObj)
    {
        if (diagnosticsObj is not Dictionary<string, object?> diagnostics) return false;
        if (!diagnostics.TryGetValue("operationOutcomeIssues", out var issuesObj) || issuesObj is not IEnumerable<object> issues) return false;

        foreach (var issueObj in issues)
        {
            if (issueObj is null) continue;
            var json = JsonSerializer.Serialize(issueObj);
            using var issueDoc = JsonDocument.Parse(json);
            var issue = issueDoc.RootElement;
            var code = issue.TryGetProperty("code", out var codeElement) ? codeElement.GetString() : null;
            var diagnosticsText = issue.TryGetProperty("diagnostics", out var diagnosticsElement) ? diagnosticsElement.GetString() : null;
            var detailsText = issue.TryGetProperty("detailsText", out var detailsElement) ? detailsElement.GetString() : null;

            if (string.Equals(code, "suppressed", StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrWhiteSpace(diagnosticsText) && diagnosticsText.Contains("Client not authorized", StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrWhiteSpace(detailsText) && detailsText.Contains("Resource request returns no results", StringComparison.OrdinalIgnoreCase)) return true;
        }
        return false;
    }

    private async Task<ImportSourceResult> ImportDevelopmentFallbackMedications(string userId)
    {
        var sourceName = "EpicSandboxDemoFallback";
        var demoMeds = new[]
        {
            new { ExternalId = "epic-sandbox-demo-metformin-500", Name = "Metformin 500mg", StrengthText = "500mg", DirectionsText = "Take one tablet by mouth twice daily with meals" },
            new { ExternalId = "epic-sandbox-demo-lisinopril-10", Name = "Lisinopril 10mg", StrengthText = "10mg", DirectionsText = "Take one tablet by mouth once daily" },
            new { ExternalId = "epic-sandbox-demo-atorvastatin-20", Name = "Atorvastatin 20mg", StrengthText = "20mg", DirectionsText = "Take one tablet by mouth nightly" }
        };

        var imported = new List<object>();
        var importedCount = 0;
        var updatedCount = 0;
        var skippedCount = 0;

        foreach (var demo in demoMeds)
        {
            var map = await _dbContext.MedicationImportMaps.FirstOrDefaultAsync(x =>
                x.OwnerUserId == userId && x.EpicResourceType == sourceName && x.EpicResourceId == demo.ExternalId);

            Medication medication;
            if (map is null)
            {
                medication = new Medication { OwnerUserId = userId, Source = sourceName };
                _dbContext.Medications.Add(medication);
                map = new MedicationImportMap { OwnerUserId = userId, EpicResourceType = sourceName, EpicResourceId = demo.ExternalId, Medication = medication };
                _dbContext.MedicationImportMaps.Add(map);
                importedCount++;
            }
            else
            {
                medication = await _dbContext.Medications.FirstAsync(x => x.Id == map.MedicationId);
                updatedCount++;
            }

            medication.Name = demo.Name;
            medication.StrengthText = demo.StrengthText;
            medication.DirectionsText = demo.DirectionsText;
            medication.IsActive = true;
            map.LastImportedAt = DateTime.UtcNow;
            imported.Add(new { medication.Name, medication.StrengthText, medication.DirectionsText, medication.IsActive });
        }

        return new ImportSourceResult(sourceName, importedCount, updatedCount, skippedCount, demoMeds.Length, imported, new Dictionary<string, object?>
        {
            ["fallbackUsed"] = true,
            ["fallbackMedicationIds"] = demoMeds.Select(x => x.ExternalId).ToArray()
        });
    }

    private async Task<ImportSourceResult> ImportFromSource(string userId, EpicConnection conn, string sourceName)
    {
        var requestedScope = _configuration["Epic:Scopes"] ?? string.Empty;
        var grantedScope = conn.Scopes ?? string.Empty;
        var requestedPathQuery = $"{sourceName}?patient={Uri.EscapeDataString(conn.PatientId!)}";
        var baseUrl = (conn.FhirBaseUrl ?? string.Empty).TrimEnd('/');
        var url = $"{baseUrl}/{requestedPathQuery}";
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", conn.AccessToken);
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/fhir+json"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        var response = await _httpClient.GetAsync(url);
        var payload = await response.Content.ReadAsStringAsync();
        var contentType = response.Content.Headers.ContentType?.MediaType;
        var payloadTrimmed = payload.TrimStart();
        var payloadStartsWithHtml = payloadTrimmed.StartsWith("<", StringComparison.Ordinal);
        var contentTypeLooksJson = !string.IsNullOrWhiteSpace(contentType)
            && (contentType.Contains("json", StringComparison.OrdinalIgnoreCase) || contentType.Contains("fhir+json", StringComparison.OrdinalIgnoreCase));

        Dictionary<string, object?> BuildBaseDiagnostics() => new()
        {
            ["epicStatusCode"] = (int)response.StatusCode,
            ["epicContentType"] = contentType,
            ["requestedFullUrl"] = url,
            ["requestedFhirPath"] = requestedPathQuery,
            ["grantedScope"] = grantedScope,
            ["requestedScope"] = requestedScope,
            ["connectedEpicPatientId"] = conn.PatientId
        };

        if (!response.IsSuccessStatusCode)
        {
            var unsupportedMedicationStatement = sourceName == "MedicationStatement" && response.StatusCode == System.Net.HttpStatusCode.NotFound;
            var message = unsupportedMedicationStatement
                ? "Epic MedicationStatement endpoint is not available for this app. Source skipped."
                : $"Epic denied {sourceName} access. Check sandbox permissions, granted scopes, or reconnect Epic.";
            return new ImportSourceResult(sourceName, 0, 0, 0, 0, [], BuildBaseDiagnostics(), StatusCode((int)response.StatusCode, new { message, diagnostics = _environment.IsDevelopment() ? BuildBaseDiagnostics() : null }), unsupportedMedicationStatement);
        }
        if (!contentTypeLooksJson || payloadStartsWithHtml)
        {
            return new ImportSourceResult(sourceName, 0, 0, 0, 0, [], BuildBaseDiagnostics(), BadRequest(new { message = $"Epic returned an invalid response for {sourceName}.", diagnostics = _environment.IsDevelopment() ? BuildBaseDiagnostics() : null }));
        }

        using var doc = JsonDocument.Parse(payload);
        var root = doc.RootElement;
        var rootResourceType = root.TryGetProperty("resourceType", out var rootTypeElement) ? rootTypeElement.GetString() : null;
        if (string.Equals(rootResourceType, "OperationOutcome", StringComparison.OrdinalIgnoreCase))
        {
            var operationOutcomeDiagnostics = BuildBaseDiagnostics();
            operationOutcomeDiagnostics["rootResourceType"] = rootResourceType;
            operationOutcomeDiagnostics["operationOutcomeIssues"] = ReadOperationOutcomeIssues(root);
            return new ImportSourceResult(sourceName, 0, 0, 0, 0, [], operationOutcomeDiagnostics, BadRequest(new { message = $"Epic returned an OperationOutcome for {sourceName}. Verify scopes, patient context, and sandbox permissions.", diagnostics = _environment.IsDevelopment() ? operationOutcomeDiagnostics : null }));
        }
        if (!string.Equals(rootResourceType, "Bundle", StringComparison.OrdinalIgnoreCase) || !root.TryGetProperty("entry", out var entries) || entries.ValueKind != JsonValueKind.Array)
        {
            return new ImportSourceResult(sourceName, 0, 0, 0, 0, []);
        }

        var imported = new List<object>();
        var bundleTotal = root.TryGetProperty("total", out var totalElement) && totalElement.ValueKind == JsonValueKind.Number ? totalElement.GetInt32() : (int?)null;
        var entryResourceTypes = new List<string>();
        var medicationRequestIds = new List<string>();
        var importedCount = 0;
        var updatedCount = 0;
        var skippedCount = 0;
        var medicationRequestEntryCount = 0;
        var skippedReasons = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var operationOutcomeIssues = new List<object>();
        var firstMedicationConcept = default((string? text, string? display, string? code, bool hasConcept));
        var firstMedicationReference = default((string? reference, string? display, bool hasReference));
        var totalEntryCount = entries.GetArrayLength();
        foreach (var entry in entries.EnumerateArray())
        {
            if (!entry.TryGetProperty("resource", out var resource) || resource.ValueKind != JsonValueKind.Object) { skippedCount++; CountSkip("entryMissingResource"); continue; }
            var resourceType = resource.TryGetProperty("resourceType", out var resourceTypeElement) ? resourceTypeElement.GetString() : null;
            if (!string.IsNullOrWhiteSpace(resourceType) && entryResourceTypes.Count < 3 && !entryResourceTypes.Contains(resourceType, StringComparer.OrdinalIgnoreCase)) entryResourceTypes.Add(resourceType);
            if (string.Equals(resourceType, "OperationOutcome", StringComparison.OrdinalIgnoreCase))
            {
                operationOutcomeIssues.AddRange(ReadOperationOutcomeIssues(resource));
            }
            if (!string.Equals(resourceType, sourceName, StringComparison.OrdinalIgnoreCase)) { skippedCount++; CountSkip("resourceTypeMismatch"); continue; }
            medicationRequestEntryCount++;
            if (!resource.TryGetProperty("id", out var idElement) || string.IsNullOrWhiteSpace(idElement.GetString())) { skippedCount++; CountSkip("missingId"); continue; }
            var resourceId = idElement.GetString()!;
            if (medicationRequestIds.Count < 3) medicationRequestIds.Add(resourceId);

            var map = await _dbContext.MedicationImportMaps.FirstOrDefaultAsync(x => x.OwnerUserId == userId && x.EpicResourceType == sourceName && x.EpicResourceId == resourceId);
            Medication medication;
            if (map is null)
            {
                medication = new Medication { OwnerUserId = userId, Source = "Epic" };
                _dbContext.Medications.Add(medication);
                map = new MedicationImportMap { OwnerUserId = userId, EpicResourceType = sourceName, EpicResourceId = resourceId, Medication = medication };
                _dbContext.MedicationImportMaps.Add(map);
                importedCount++;
            }
            else
            {
                medication = await _dbContext.Medications.FirstAsync(x => x.Id == map.MedicationId);
                updatedCount++;
            }

            medication.Name = ReadName(resource);
            if (string.IsNullOrWhiteSpace(medication.Name))
            {
                skippedCount++;
                CountSkip("missingMedicationName");
                continue;
            }
            medication.StrengthText = sourceName == "MedicationStatement" ? ReadMedicationStatementStrength(resource) : ReadStrength(resource);
            medication.DirectionsText = sourceName == "MedicationStatement" ? ReadMedicationStatementDirections(resource) : ReadDirections(resource);
            medication.IsActive = ReadStatus(resource) is "active" or "on-hold" or "completed";
            map.LastImportedAt = DateTime.UtcNow;
            imported.Add(new { medication.Name, medication.StrengthText, medication.DirectionsText, medication.IsActive });

            if (!firstMedicationConcept.hasConcept && TryReadMedicationCodeableConcept(resource, out var conceptText, out var conceptDisplay, out var conceptCode))
            {
                firstMedicationConcept = (conceptText, conceptDisplay, conceptCode, true);
            }
            if (!firstMedicationReference.hasReference && TryReadMedicationReference(resource, out var medRef, out var medRefDisplay))
            {
                firstMedicationReference = (medRef, medRefDisplay, true);
            }
        }
        void CountSkip(string reason) => skippedReasons[reason] = skippedReasons.TryGetValue(reason, out var count) ? count + 1 : 1;
        var bundleDiagnostics = BuildBaseDiagnostics();
        bundleDiagnostics["rootResourceType"] = rootResourceType;
        bundleDiagnostics["bundleTotal"] = bundleTotal;
        bundleDiagnostics["entryCount"] = totalEntryCount;
        bundleDiagnostics["medicationRequestEntryCount"] = medicationRequestEntryCount;
        bundleDiagnostics["skippedCount"] = skippedCount;
        bundleDiagnostics["skippedReasons"] = skippedReasons;
        bundleDiagnostics["entryResourceTypesSample"] = entryResourceTypes;
        bundleDiagnostics["medicationRequestIdsSample"] = medicationRequestIds;
        bundleDiagnostics["hasMedicationCodeableConcept"] = firstMedicationConcept.hasConcept;
        bundleDiagnostics["hasMedicationReference"] = firstMedicationReference.hasReference;
        bundleDiagnostics["medicationCodeableConceptSample"] = new { text = firstMedicationConcept.text, display = firstMedicationConcept.display, code = firstMedicationConcept.code };
        bundleDiagnostics["medicationReferenceSample"] = new { reference = firstMedicationReference.reference, display = firstMedicationReference.display };
        if (operationOutcomeIssues.Count > 0)
        {
            bundleDiagnostics["operationOutcomeIssues"] = operationOutcomeIssues;
        }
        return new ImportSourceResult(sourceName, importedCount, updatedCount, skippedCount, totalEntryCount, imported, bundleDiagnostics);
    }

    private static List<object> ReadOperationOutcomeIssues(JsonElement operationOutcome)
    {
        var issues = new List<object>();
        if (!operationOutcome.TryGetProperty("issue", out var issueArray) || issueArray.ValueKind != JsonValueKind.Array)
        {
            return issues;
        }

        foreach (var issue in issueArray.EnumerateArray())
        {
            if (issue.ValueKind != JsonValueKind.Object) continue;
            var severity = issue.TryGetProperty("severity", out var severityElement) ? severityElement.GetString() : null;
            var code = issue.TryGetProperty("code", out var codeElement) ? codeElement.GetString() : null;
            var issueDiagnostics = issue.TryGetProperty("diagnostics", out var diagnosticsElement) ? diagnosticsElement.GetString() : null;
            var detailsText = issue.TryGetProperty("details", out var detailsElement)
                && detailsElement.ValueKind == JsonValueKind.Object
                && detailsElement.TryGetProperty("text", out var textElement)
                ? textElement.GetString()
                : null;
            var expression = issue.TryGetProperty("expression", out var expressionElement) && expressionElement.ValueKind == JsonValueKind.Array
                ? expressionElement.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<object>().ToList()
                : [];
            var location = issue.TryGetProperty("location", out var locationElement) && locationElement.ValueKind == JsonValueKind.Array
                ? locationElement.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<object>().ToList()
                : [];

            issues.Add(new
            {
                severity,
                code,
                diagnostics = issueDiagnostics,
                detailsText,
                expression,
                location
            });
        }

        return issues;
    }

    private static string ReadName(JsonElement resource)
    {
        if (resource.TryGetProperty("medicationCodeableConcept", out var concept) && concept.ValueKind == JsonValueKind.Object)
        {
            if (concept.TryGetProperty("text", out var text))
            {
                var textValue = text.GetString();
                if (!string.IsNullOrWhiteSpace(textValue)) return textValue;
            }

            if (concept.TryGetProperty("coding", out var codingArray) && codingArray.ValueKind == JsonValueKind.Array && codingArray.GetArrayLength() > 0)
            {
                var firstCoding = codingArray[0];
                if (firstCoding.ValueKind == JsonValueKind.Object)
                {
                    if (firstCoding.TryGetProperty("display", out var display))
                    {
                        var displayValue = display.GetString();
                        if (!string.IsNullOrWhiteSpace(displayValue)) return displayValue;
                    }

                    if (firstCoding.TryGetProperty("code", out var code))
                    {
                        var codeValue = code.GetString();
                        if (!string.IsNullOrWhiteSpace(codeValue)) return codeValue;
                    }
                }
            }
        }
        if (TryReadMedicationReference(resource, out var reference, out var referenceDisplay))
        {
            if (!string.IsNullOrWhiteSpace(referenceDisplay)) return referenceDisplay!;
            if (!string.IsNullOrWhiteSpace(reference)) return reference!;
        }
        return "Imported Epic medication";
    }

    private static bool TryReadMedicationCodeableConcept(JsonElement resource, out string? text, out string? display, out string? code)
    {
        text = null;
        display = null;
        code = null;
        if (!resource.TryGetProperty("medicationCodeableConcept", out var concept) || concept.ValueKind != JsonValueKind.Object) return false;
        if (concept.TryGetProperty("text", out var textValue)) text = textValue.GetString();
        if (concept.TryGetProperty("coding", out var codingArray) && codingArray.ValueKind == JsonValueKind.Array && codingArray.GetArrayLength() > 0)
        {
            var firstCoding = codingArray[0];
            if (firstCoding.ValueKind == JsonValueKind.Object)
            {
                if (firstCoding.TryGetProperty("display", out var displayValue)) display = displayValue.GetString();
                if (firstCoding.TryGetProperty("code", out var codeValue)) code = codeValue.GetString();
            }
        }
        return true;
    }

    private static bool TryReadMedicationReference(JsonElement resource, out string? reference, out string? display)
    {
        reference = null;
        display = null;
        if (!resource.TryGetProperty("medicationReference", out var medReference) || medReference.ValueKind != JsonValueKind.Object) return false;
        if (medReference.TryGetProperty("reference", out var referenceValue)) reference = referenceValue.GetString();
        if (medReference.TryGetProperty("display", out var displayValue)) display = displayValue.GetString();
        return true;
    }

    private static string? ReadStrength(JsonElement resource)
    {
        if (!resource.TryGetProperty("dosageInstruction", out var dosage) || dosage.ValueKind != JsonValueKind.Array || dosage.GetArrayLength() == 0) return null;
        var first = dosage[0];
        if (first.TryGetProperty("doseAndRate", out var doseRate) && doseRate.ValueKind == JsonValueKind.Array && doseRate.GetArrayLength() > 0)
        {
            var dr = doseRate[0];
            if (dr.TryGetProperty("doseQuantity", out var quantity) && quantity.TryGetProperty("text", out var text)) return text.GetString();
        }
        return null;
    }

    private static string? ReadDirections(JsonElement resource)
    {
        if (!resource.TryGetProperty("dosageInstruction", out var dosage) || dosage.ValueKind != JsonValueKind.Array || dosage.GetArrayLength() == 0) return null;
        var first = dosage[0];
        if (first.TryGetProperty("text", out var text)) return text.GetString();
        return null;
    }

    private static string? ReadMedicationStatementStrength(JsonElement resource) => null;

    private static string? ReadMedicationStatementDirections(JsonElement resource)
    {
        if (!resource.TryGetProperty("dosage", out var dosage) || dosage.ValueKind != JsonValueKind.Array || dosage.GetArrayLength() == 0) return null;
        var first = dosage[0];
        if (first.ValueKind != JsonValueKind.Object) return null;
        if (!first.TryGetProperty("text", out var text)) return null;
        return text.GetString();
    }

    private static string ReadStatus(JsonElement resource) => resource.TryGetProperty("status", out var status) ? status.GetString() ?? "unknown" : "unknown";

    private static bool ScopeContainsMedicationRequest(string scopes)
    {
        if (string.IsNullOrWhiteSpace(scopes)) return false;
        var values = scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return values.Any(scope => scope.Equals("patient/MedicationRequest.read", StringComparison.OrdinalIgnoreCase)
            || scope.Equals("MedicationRequest.Read", StringComparison.OrdinalIgnoreCase)
            || scope.Contains("MedicationRequest", StringComparison.OrdinalIgnoreCase));
    }
}
