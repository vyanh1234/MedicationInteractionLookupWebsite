using Microsoft.Data.SqlClient;

var server = Environment.GetEnvironmentVariable("MEDCHECK_DB_SERVER") ?? @"(localdb)\MSSQLLocalDB";
const string database = "HTTraCuuThuoc_AI";
var masterCs = $"Server={server};Database=master;Integrated Security=true;Encrypt=false;TrustServerCertificate=true;Connect Timeout=15";

await using var master = new SqlConnection(masterCs);
await master.OpenAsync();
Console.WriteLine($"Connected: {master.DataSource} / SQL Server {master.ServerVersion}");

await using (var command = master.CreateCommand())
{
    command.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name=@name";
    command.Parameters.AddWithValue("@name", database);
    var exists = Convert.ToInt32(await command.ExecuteScalarAsync()) > 0;
    Console.WriteLine($"Database {database}: {(exists ? "exists" : "not found")}");
    if (!exists && args.Contains("--deploy"))
    {
        command.Parameters.Clear();
        command.CommandText = $"CREATE DATABASE [{database}]";
        await command.ExecuteNonQueryAsync();
        Console.WriteLine("Database created.");
    }
    else if (!exists) return;
}

var appCs = $"Server={server};Database={database};Integrated Security=true;Encrypt=false;TrustServerCertificate=true;Connect Timeout=15";
await using var app = new SqlConnection(appCs);
await app.OpenAsync();
var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
if (args.Contains("--migrate"))
{
    var migration = await File.ReadAllTextAsync(Path.Combine(root, "src", "main", "resources", "migration-v2.sql"));
    await using var migrate = app.CreateCommand();
    migrate.CommandText = migration;
    migrate.CommandTimeout = 120;
    await migrate.ExecuteNonQueryAsync();
    Console.WriteLine("Applied migration-v2.sql");
}

await using (var inspect = app.CreateCommand())
{
    inspect.CommandText = "SELECT t.name, COUNT(c.column_id) FROM sys.tables t LEFT JOIN sys.columns c ON c.object_id=t.object_id GROUP BY t.name ORDER BY t.name";
    await using var reader = await inspect.ExecuteReaderAsync();
    var count = 0;
    while (await reader.ReadAsync())
    {
        Console.WriteLine($"  {reader.GetString(0),-32} {reader.GetInt32(1),3} columns");
        count++;
    }
    Console.WriteLine($"Tables: {count}");
}

foreach (var table in new[] { "Thuoc", "HoatChat", "BenhNen", "DiUng", "QuyTacCanhBao" })
{
    await using var countCommand = app.CreateCommand();
    countCommand.CommandText = $"IF OBJECT_ID('{table}', 'U') IS NULL SELECT -1 ELSE SELECT COUNT(*) FROM [{table}]";
    var count = Convert.ToInt32(await countCommand.ExecuteScalarAsync());
    if (count >= 0) Console.WriteLine($"Rows {table,-24}: {count}");
}

if (!args.Contains("--deploy")) return;
await using (var check = app.CreateCommand())
{
    check.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE name='TaiKhoan'";
    if (Convert.ToInt32(await check.ExecuteScalarAsync()) > 0)
    {
        Console.WriteLine("Existing application schema detected; deployment skipped to protect current data.");
        return;
    }
}

foreach (var file in new[] { "schema.sql", "data.sql" })
{
    var sql = await File.ReadAllTextAsync(Path.Combine(root, "src", "main", "resources", file));
    await using var command = app.CreateCommand();
    command.CommandText = sql;
    command.CommandTimeout = 120;
    await command.ExecuteNonQueryAsync();
    Console.WriteLine($"Applied {file}");
}
