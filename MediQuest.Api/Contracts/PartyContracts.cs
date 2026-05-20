namespace MediQuest.Api.Contracts;

public record CreatePartyRequest(string Name);
public record AddPartyMemberRequest(string? Email, string? MemberCode);
