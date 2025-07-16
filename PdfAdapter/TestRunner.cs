using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace PdfAdapter.TestRunner;

/// <summary>
///     Skrypt do automatycznego testowania i porównywania serwisów PDF
/// </summary>
public class TestRunner
{
    private readonly HttpClient _httpClient;
    private readonly int[] _ports = { 5001, 5002, 5003 };
    private readonly string[] _services = { "IronPDF", "PdfSharp", "Python" };

    public TestRunner()
    {
        _httpClient = new HttpClient();
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    /// <summary>
    ///     Uruchamia pełny zestaw testów porównawczych
    /// </summary>
    public async Task RunFullTestSuite()
    {
        Console.WriteLine("=== TESTY PORÓWNAWCZE SERWISÓW PDF ===\n");

        // Sprawdź dostępność serwisów
        await CheckServicesHealth();

        // Testy łączenia PDF
        await TestPdfMerge();

        // Testy konwersji obrazów
        await TestImageConversion();

        // Testy łączenia PDF i obrazów
        await TestPdfAndImageMerge();

        // Testy ekstrakcji tekstu
        await TestTextExtraction();

        // Testy z różnymi formatami stron
        await TestPageFormats();

        Console.WriteLine("\n=== PODSUMOWANIE WYNIKÓW ===");
        await GenerateSummary();
    }

    private async Task CheckServicesHealth()
    {
        Console.WriteLine("🔍 Sprawdzanie dostępności serwisów...");

        for (var i = 0; i < _services.Length; i++)
        {
            var service = _services[i];
            var port = _ports[i];
            var url = $"http://localhost:{port}/health";

            try
            {
                var response = await _httpClient.GetAsync(url);
                var status = response.IsSuccessStatusCode ? "✅" : "❌";
                Console.WriteLine($"{status} {service} (port {port}): {response.StatusCode}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ {service} (port {port}): Błąd - {ex.Message}");
            }
        }

        Console.WriteLine();
    }

    private async Task TestPdfMerge()
    {
        Console.WriteLine("📄 Test łączenia plików PDF...");

        var testResults = new List<TestResult>();

        foreach (var service in _services)
        {
            var port = GetPortForService(service);
            var url = $"http://localhost:{port}/api/pdf/merge";

            try
            {
                var stopwatch = Stopwatch.StartNew();

                // Przygotuj dane testowe (symulacja)
                var formData = new MultipartFormDataContent();
                // formData.Add(new ByteArrayContent(GetTestPdfBytes()), "files", "test1.pdf");
                // formData.Add(new ByteArrayContent(GetTestPdfBytes()), "files", "test2.pdf");

                var response = await _httpClient.PostAsync(url, formData);
                stopwatch.Stop();

                var result = new TestResult
                {
                    Service = service,
                    Operation = "PDF Merge",
                    Success = response.IsSuccessStatusCode,
                    ResponseTime = stopwatch.Elapsed,
                    StatusCode = response.StatusCode,
                    FileSize = response.IsSuccessStatusCode ? await GetResponseSize(response) : 0
                };

                testResults.Add(result);
                Console.WriteLine(
                    $"  {(result.Success ? "✅" : "❌")} {service}: {result.ResponseTime.TotalMilliseconds:F0}ms, {result.FileSize} bytes");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ❌ {service}: Błąd - {ex.Message}");
                testResults.Add(new TestResult
                {
                    Service = service,
                    Operation = "PDF Merge",
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        SaveTestResults("pdf_merge", testResults);
        Console.WriteLine();
    }

    private async Task TestImageConversion()
    {
        Console.WriteLine("🖼️ Test konwersji obrazów do PDF...");

        var testResults = new List<TestResult>();

        foreach (var service in _services)
        {
            var port = GetPortForService(service);
            var url = $"http://localhost:{port}/api/pdf/images-to-pdf";

            try
            {
                var stopwatch = Stopwatch.StartNew();

                var formData = new MultipartFormDataContent();
                // formData.Add(new ByteArrayContent(GetTestImageBytes()), "files", "test.jpg");

                var response = await _httpClient.PostAsync(url, formData);
                stopwatch.Stop();

                var result = new TestResult
                {
                    Service = service,
                    Operation = "Image to PDF",
                    Success = response.IsSuccessStatusCode,
                    ResponseTime = stopwatch.Elapsed,
                    StatusCode = response.StatusCode,
                    FileSize = response.IsSuccessStatusCode ? await GetResponseSize(response) : 0
                };

                testResults.Add(result);
                Console.WriteLine(
                    $"  {(result.Success ? "✅" : "❌")} {service}: {result.ResponseTime.TotalMilliseconds:F0}ms, {result.FileSize} bytes");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ❌ {service}: Błąd - {ex.Message}");
                testResults.Add(new TestResult
                {
                    Service = service,
                    Operation = "Image to PDF",
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        SaveTestResults("image_conversion", testResults);
        Console.WriteLine();
    }

    private async Task TestPdfAndImageMerge()
    {
        Console.WriteLine("📄🖼️ Test łączenia PDF i obrazów...");

        var testResults = new List<TestResult>();

        foreach (var service in _services)
        {
            var port = GetPortForService(service);
            var url = $"http://localhost:{port}/api/pdf/merge-all";

            try
            {
                var stopwatch = Stopwatch.StartNew();

                var formData = new MultipartFormDataContent();
                // formData.Add(new ByteArrayContent(GetTestPdfBytes()), "files", "test.pdf");
                // formData.Add(new ByteArrayContent(GetTestImageBytes()), "files", "test.jpg");

                var response = await _httpClient.PostAsync(url, formData);
                stopwatch.Stop();

                var result = new TestResult
                {
                    Service = service,
                    Operation = "PDF + Image Merge",
                    Success = response.IsSuccessStatusCode,
                    ResponseTime = stopwatch.Elapsed,
                    StatusCode = response.StatusCode,
                    FileSize = response.IsSuccessStatusCode ? await GetResponseSize(response) : 0
                };

                testResults.Add(result);
                Console.WriteLine(
                    $"  {(result.Success ? "✅" : "❌")} {service}: {result.ResponseTime.TotalMilliseconds:F0}ms, {result.FileSize} bytes");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ❌ {service}: Błąd - {ex.Message}");
                testResults.Add(new TestResult
                {
                    Service = service,
                    Operation = "PDF + Image Merge",
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        SaveTestResults("pdf_image_merge", testResults);
        Console.WriteLine();
    }

    private async Task TestTextExtraction()
    {
        Console.WriteLine("📝 Test ekstrakcji tekstu z PDF...");

        var testResults = new List<TestResult>();

        // Tylko IronPDF i Python obsługują ekstrakcję tekstu
        var servicesWithTextExtraction = new[] { "IronPDF", "Python" };

        foreach (var service in servicesWithTextExtraction)
        {
            var port = GetPortForService(service);
            var url = $"http://localhost:{port}/api/pdf/extract-text";

            try
            {
                var stopwatch = Stopwatch.StartNew();

                var formData = new MultipartFormDataContent();
                // formData.Add(new ByteArrayContent(GetTestPdfBytes()), "file", "test.pdf");

                var response = await _httpClient.PostAsync(url, formData);
                stopwatch.Stop();

                var result = new TestResult
                {
                    Service = service,
                    Operation = "Text Extraction",
                    Success = response.IsSuccessStatusCode,
                    ResponseTime = stopwatch.Elapsed,
                    StatusCode = response.StatusCode,
                    FileSize = response.IsSuccessStatusCode ? await GetResponseSize(response) : 0
                };

                testResults.Add(result);
                Console.WriteLine(
                    $"  {(result.Success ? "✅" : "❌")} {service}: {result.ResponseTime.TotalMilliseconds:F0}ms");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ❌ {service}: Błąd - {ex.Message}");
                testResults.Add(new TestResult
                {
                    Service = service,
                    Operation = "Text Extraction",
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        SaveTestResults("text_extraction", testResults);
        Console.WriteLine();
    }

    private async Task TestPageFormats()
    {
        Console.WriteLine("📏 Test różnych formatów stron...");

        var formats = new[] { "A4", "A3", "A5", "LETTER" };
        var testResults = new List<TestResult>();

        foreach (var format in formats)
        foreach (var service in _services)
        {
            var port = GetPortForService(service);
            var url = $"http://localhost:{port}/api/pdf/merge?outputFormat={format}";

            try
            {
                var stopwatch = Stopwatch.StartNew();

                var formData = new MultipartFormDataContent();

                // formData.Add(new ByteArrayContent(GetTestPdfBytes()), "files", "test.pdf");
                var response = await _httpClient.PostAsync(url, formData);
                stopwatch.Stop();

                var result = new TestResult
                {
                    Service = service,
                    Operation = $"Format {format}",
                    Success = response.IsSuccessStatusCode,
                    ResponseTime = stopwatch.Elapsed,
                    StatusCode = response.StatusCode,
                    FileSize = response.IsSuccessStatusCode ? await GetResponseSize(response) : 0
                };

                testResults.Add(result);
                Console.WriteLine(
                    $"  {(result.Success ? "✅" : "❌")} {service} ({format}): {result.ResponseTime.TotalMilliseconds:F0}ms");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  ❌ {service} ({format}): Błąd - {ex.Message}");
                testResults.Add(new TestResult
                {
                    Service = service,
                    Operation = $"Format {format}",
                    Success = false,
                    Error = ex.Message
                });
            }
        }

        SaveTestResults("page_formats", testResults);
        Console.WriteLine();
    }

    private async Task GenerateSummary()
    {
        Console.WriteLine("📊 Generowanie podsumowania wyników...");

        var summary = new TestSummary
        {
            Timestamp = DateTime.Now,
            Services = _services,
            Results = new Dictionary<string, ServiceSummary>()
        };

        foreach (var service in _services)
            summary.Results[service] = new ServiceSummary
            {
                ServiceName = service,
                Port = GetPortForService(service),
                TotalTests = 0,
                SuccessfulTests = 0,
                AverageResponseTime = TimeSpan.Zero,
                TotalFileSize = 0
            };

        // Zapisz podsumowanie
        var summaryJson = JsonSerializer.Serialize(summary, new JsonSerializerOptions { WriteIndented = true });
        await File.WriteAllTextAsync("test_summary.json", summaryJson);

        Console.WriteLine("✅ Podsumowanie zapisane w pliku 'test_summary.json'");
    }

    private int GetPortForService(string service)
    {
        var index = Array.IndexOf(_services, service);
        return index >= 0 ? _ports[index] : 5001;
    }

    private async Task<long> GetResponseSize(HttpResponseMessage response)
    {
        if (response.Content?.Headers?.ContentLength != null)
            return response.Content.Headers.ContentLength.Value;

        var content = await response.Content?.ReadAsByteArrayAsync();
        return content?.Length ?? 0;
    }

    private void SaveTestResults(string operation, List<TestResult> results)
    {
        var json = JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true });
        var filename = $"test_results_{operation}_{DateTime.Now:yyyyMMdd_HHmmss}.json";
        File.WriteAllText(filename, json);
    }

    // Metody pomocnicze do generowania danych testowych
    private byte[] GetTestPdfBytes()
    {
        // Symulacja danych PDF
        return new byte[1024];
    }

    private byte[] GetTestImageBytes()
    {
        // Symulacja danych obrazu
        return new byte[512];
    }
}

public class TestResult
{
    public string Service { get; set; } = "";
    public string Operation { get; set; } = "";
    public bool Success { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public HttpStatusCode StatusCode { get; set; }
    public long FileSize { get; set; }
    public string? Error { get; set; }
}

public class ServiceSummary
{
    public string ServiceName { get; set; } = "";
    public int Port { get; set; }
    public int TotalTests { get; set; }
    public int SuccessfulTests { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
    public long TotalFileSize { get; set; }
}

public class TestSummary
{
    public DateTime Timestamp { get; set; }
    public string[] Services { get; set; } = Array.Empty<string>();
    public Dictionary<string, ServiceSummary> Results { get; set; } = new();
}