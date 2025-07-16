using Microsoft.AspNetCore.Mvc;
using PdfSharpService.Services;

namespace PdfSharpService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PdfController : ControllerBase
{
    private readonly ILogger<PdfController> _logger;
    private readonly IPdfService _pdfService;

    public PdfController(IPdfService pdfService, ILogger<PdfController> logger)
    {
        _pdfService = pdfService;
        _logger = logger;
    }

    /// <summary>
    ///     Łączy kilka plików PDF w jeden dokument (PdfSharpCore)
    /// </summary>
    /// <param name="files">Kolekcja plików PDF</param>
    /// <param name="outputFormat">Format wyjściowy (A4, A3, A5, LETTER)</param>
    /// <returns>Połączony plik PDF</returns>
    [HttpPost("merge-pdfs")]
    public async Task<IActionResult> MergePdfFiles(IFormFileCollection files, [FromQuery] string outputFormat = "A4")
    {
        try
        {
            if (files == null || files.Count == 0) return BadRequest(new { message = "Nie przekazano żadnych plików" });

            var result = await _pdfService.MergePdfFilesAsync(files, outputFormat);

            if (!result.Success) return BadRequest(new { message = result.Message });

            return File(result.PdfContent!, "application/pdf", result.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas łączenia plików PDF");
            return StatusCode(500, new { message = "Wystąpił błąd wewnętrzny serwera" });
        }
    }

    /// <summary>
    ///     Konwertuje obrazy do formatu PDF (PdfSharpCore)
    /// </summary>
    /// <param name="files">Kolekcja plików obrazów</param>
    /// <param name="outputFormat">Format wyjściowy (A4, A3, A5, LETTER)</param>
    /// <returns>Plik PDF zawierający obrazy</returns>
    [HttpPost("images-to-pdf")]
    public async Task<IActionResult> ConvertImagesToPdf(IFormFileCollection files,
        [FromQuery] string outputFormat = "A4")
    {
        try
        {
            if (files == null || files.Count == 0) return BadRequest(new { message = "Nie przekazano żadnych plików" });

            var result = await _pdfService.ConvertImagesToPdfAsync(files, outputFormat);

            if (!result.Success) return BadRequest(new { message = result.Message });

            return File(result.PdfContent!, "application/pdf", result.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas konwersji obrazów do PDF");
            return StatusCode(500, new { message = "Wystąpił błąd wewnętrzny serwera" });
        }
    }

    /// <summary>
    ///     Łączy pliki PDF i obrazy w jeden dokument (PdfSharpCore)
    /// </summary>
    /// <param name="files">Kolekcja plików PDF i obrazów</param>
    /// <param name="outputFormat">Format wyjściowy (A4, A3, A5, LETTER)</param>
    /// <returns>Połączony plik PDF</returns>
    [HttpPost("merge-all")]
    public async Task<IActionResult> MergePdfsAndImages(IFormFileCollection files,
        [FromQuery] string outputFormat = "A4")
    {
        try
        {
            if (files == null || files.Count == 0) return BadRequest(new { message = "Nie przekazano żadnych plików" });

            var result = await _pdfService.MergePdfsAndImagesAsync(files, outputFormat);

            if (!result.Success) return BadRequest(new { message = result.Message });

            return File(result.PdfContent!, "application/pdf", result.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas łączenia plików PDF i obrazów");
            return StatusCode(500, new { message = "Wystąpił błąd wewnętrzny serwera" });
        }
    }

    /// <summary>
    ///     Ekstrahuje tekst z pliku PDF (PdfSharpCore - ograniczona funkcjonalność)
    /// </summary>
    /// <param name="file">Plik PDF</param>
    /// <returns>Plik tekstowy z wyekstrahowaną treścią</returns>
    [HttpPost("extract-text")]
    public async Task<IActionResult> ExtractTextFromPdf(IFormFile file)
    {
        try
        {
            if (file == null) return BadRequest(new { message = "Nie przekazano pliku" });

            var result = await _pdfService.ExtractTextFromPdfAsync(file);

            if (!result.Success) return BadRequest(new { message = result.Message });

            return File(result.PdfContent!, "text/plain", result.FileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Błąd podczas ekstrakcji tekstu z PDF");
            return StatusCode(500, new { message = "Wystąpił błąd wewnętrzny serwera" });
        }
    }

    /// <summary>
    ///     Zwraca informacje o obsługiwanych formatach plików
    /// </summary>
    /// <returns>Lista obsługiwanych formatów</returns>
    [HttpGet("supported-formats")]
    public IActionResult GetSupportedFormats()
    {
        return Ok(new
        {
            service = "PdfSharpCore",
            description = "Czysto .NET implementacja bez zewnętrznych zależności",
            supportedImageFormats = new[] { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif" },
            supportedPdfFormats = new[] { ".pdf" },
            supportedOutputFormats = new[] { "A4", "A3", "A5", "LETTER" },
            limitations = new[]
            {
                "Brak ekstrakcji tekstu z PDF",
                "Ograniczona obsługa zaawansowanych funkcji PDF"
            }
        });
    }
}