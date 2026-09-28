# ==========================================
# 1. Build Stage (.NET 8 SDK)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["FurniMatch.Api.csproj", "./"]
RUN dotnet restore "FurniMatch.Api.csproj"

COPY . .
RUN dotnet publish "FurniMatch.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# 2. Runtime Stage (.NET 8 ASP.NET Core Runtime)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_HTTP_PORTS=8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080
EXPOSE 10000

COPY --from=build /app/publish .

# Create uploads directories for uploaded media files
RUN mkdir -p /app/wwwroot/uploads/products \
             /app/wwwroot/uploads/disputes \
             /app/wwwroot/uploads/receipts \
             /app/wwwroot/uploads/banners \
             /app/wwwroot/uploads/quotations

ENTRYPOINT ["dotnet", "FurniMatch.Api.dll"]
