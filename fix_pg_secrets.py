"""Fix PostgreSQL DATABASE_URL secrets - URL-encode the password"""
from azure.identity import DefaultAzureCredential
from azure.mgmt.appcontainers import ContainerAppsAPIClient
from azure.mgmt.appcontainers.models import ContainerApp, Configuration, Secret
import urllib.parse
import subprocess, json

subscription_id = "2f326d79-e30d-4244-99e8-bc0492e7851c"
resource_group = "rg-food-ordering"

# URL-encode the password
password = "F00d@rder2026!"
encoded_password = urllib.parse.quote(password, safe='')
jwt_secret = "food-ordering-jwt-secret-2026"
acr_name = "foodorderacrpacq3opfig4ya"

# Get ACR password
r = subprocess.run(['az.cmd', 'acr', 'credential', 'show', '-n', acr_name, '--query', 'passwords[0].value', '-o', 'tsv'],
                   capture_output=True, text=True, timeout=20)
acr_password = r.stdout.strip()
print(f"ACR password retrieved: {'yes' if acr_password else 'NO'}")

pg_host = "foodorder-pg-pacq3opfig4ya.postgres.database.azure.com"
pg_user = "pgadmin"

restaurant_url = f"postgresql+asyncpg://{pg_user}:{encoded_password}@{pg_host}:5432/restaurant_db?ssl=require"
notification_url = f"postgresql+asyncpg://{pg_user}:{encoded_password}@{pg_host}:5432/notification_db?ssl=require"

credential = DefaultAzureCredential()
client = ContainerAppsAPIClient(credential, subscription_id)

def update_pg_secret(app_name, db_url):
    app = client.container_apps.get(resource_group, app_name)

    # Rebuild all secrets with known values
    new_secrets = [
        Secret(name='acr-password', value=acr_password),
        Secret(name='database-url', value=db_url),
        Secret(name='jwt-secret', value=jwt_secret),
        Secret(name='smtp-user', value='placeholder'),
        Secret(name='smtp-password', value='placeholder'),
    ]

    update = ContainerApp(
        location=app.location,
        configuration=Configuration(
            secrets=new_secrets,
            registries=app.configuration.registries,
            ingress=app.configuration.ingress,
            active_revisions_mode=app.configuration.active_revisions_mode,
        ),
        template=app.template,
        managed_environment_id=app.managed_environment_id,
    )

    print(f"Updating {app_name}...")
    result = client.container_apps.begin_create_or_update(resource_group, app_name, update).result()
    print(f"  {app_name}: {result.provisioning_state}")
    return result

print("\n--- restaurant-service ---")
update_pg_secret("restaurant-service", restaurant_url)

print("\n--- notification-service ---")
update_pg_secret("notification-service", notification_url)

print("\nDone! Restarting revisions...")

# Restart revisions
for svc in ["restaurant-service", "notification-service"]:
    r = subprocess.run(['az.cmd', 'containerapp', 'show', '-n', svc, '-g', resource_group,
                        '--query', 'properties.latestRevisionName', '-o', 'tsv'],
                       capture_output=True, text=True, timeout=20)
    revision = r.stdout.strip()
    print(f"  Restarting {svc} revision: {revision}")
    r2 = subprocess.run(['az.cmd', 'containerapp', 'revision', 'restart',
                         '-n', svc, '-g', resource_group, '--revision', revision],
                        capture_output=True, text=True, timeout=30)
    print(f"  RC: {r2.returncode} {r2.stderr[:100] if r2.returncode != 0 else 'OK'}")

