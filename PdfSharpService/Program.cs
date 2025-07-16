using Microsoft.OpenApi.Models;
using PdfSharpService.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
  c.SwaggerDoc("v1", new OpenApiInfo { Title = "PdfSharpCore Service API", Version = "v1" });
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
  app.UseSwaggerUI(c => { c.SwaggerEndpoint("/swagger/v1/swagger.json", "PdfSharpCore Service API v1"); });
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthorization();

// Add health check endpoint
app.MapGet("/health", () => new
{
  status = "healthy",
  service = "PdfSharpService",
  timestamp = DateTime.UtcNow,
  version = "1.0.0"
});

app.MapControllers();

app.Run();