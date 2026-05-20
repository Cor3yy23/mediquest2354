<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.0" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0">
      <PrivateAssets>all</PrivateAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
  </ItemGroup>

  <ItemGroup>
    <Compile Remove="Controllers/DosesController.cs" />
    <Compile Remove="Controllers/QuestsController.cs" />
    <Compile Remove="Controllers/StatsController.cs" />
    <Compile Remove="Services/DoseService.cs" />
    <Compile Remove="Services/QuestService.cs" />
    <Compile Remove="Services/StatsService.cs" />
    <Compile Remove="Services/DemoConstants.cs" />
    <Compile Remove="Services/MedicationService.cs" />
    <Compile Remove="Models/Dtos.cs" />
    <Compile Remove="Models/User.cs" />
    <Compile Remove="Models/MedicationSchedule.cs" />
    <Compile Remove="Models/DoseLog.cs" />
    <Compile Remove="Models/Quest.cs" />
    <Compile Remove="Models/QuestProgress.cs" />
    <Compile Remove="Models/Enums.cs" />
  </ItemGroup>

</Project>
