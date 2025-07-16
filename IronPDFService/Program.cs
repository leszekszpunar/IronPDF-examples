using IronPDFService.Services;
using Microsoft.OpenApi.Models;
using IronPdf;

var builder = WebApplication.CreateBuilder(args);

// Configure IronPDF for macOS compatibility
// Set custom temp directory to avoid MIME type issues
var tempDir = Path.Combine(Path.GetTempPath(), "IronPDF");
Directory.CreateDirectory(tempDir);
Environment.SetEnvironmentVariable("TEMP", tempDir);
Environment.SetEnvironmentVariable("TMP", tempDir);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
  c.SwaggerDoc("v1", new OpenApiInfo { Title = "IronPDF Service API", Version = "v1" });
});

// Register services
builder.Services.AddScoped<IPdfService, PdfService>();

// Configure CORS
builder.Services.AddCors(options =>
{
  options.AddPolicy("AllowAll", policy =>
  {
    policy.AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader();
  });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
  app.UseSwagger();
  app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "IronPDF Service API v1"); });
}

// Disable HTTPS redirection for macOS compatibility
// app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

// Add health check endpoint
app.MapGet("/health", () => new
{
  status = "healthy",
  service = "IronPDFService",
  timestamp = DateTime.UtcNow,
  version = "1.0.0"
});

app.MapControllers();

app.Run();