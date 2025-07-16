using System.Diagnostics;
using PdfAdapter.Interfaces;
using PdfAdapter.Models;

namespace PdfAdapter.Engines;

/// <summary>
///     Silnik PDF oparty na PdfPig
/// </summary>
public class PdfPigEngine : IPdfEngine
{
    public string Name => "PdfPig";
    public bool SupportsMerge => false; // PdfPig nie obsługuje tworzenia PDF
    public bool SupportsImageToPdf => false; // PdfPig nie obsługuje tworzenia PDF
    public bool SupportsTextExtraction => true;

    public Task<PdfResult> MergePdfsAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            return Task.FromResult(
                PdfResult.ErrorResult("PdfPig nie obsługuje tworzenia ani łączenia plików PDF", Name));
        }
        catch (Exception ex)
        {
            return Task.FromResult(PdfResult.ErrorResult($"Błąd podczas łączenia PDF: {ex.Message}", Name));
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    public Task<PdfResult> ConvertImagesToPdfAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            return Task.FromResult(PdfResult.ErrorResult("PdfPig nie obsługuje tworzenia plików PDF", Name));
        }
        catch (Exception ex)
        {
            return Task.FromResult(PdfResult.ErrorResult($"Błąd podczas konwersji obrazów do PDF: {ex.Message}", Name));
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    public Task<PdfResult> MergePdfsAndImagesAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            return Task.FromResult(
                PdfResult.ErrorResult("PdfPig nie obsługuje tworzenia ani łączenia plików PDF", Name));
        }
        catch (Exception ex)
        {
            return Task.FromResult(PdfResult.ErrorResult($"Błąd podczas łączenia PDF i obrazów: {ex.Message}", Name));
        }
        finally
        {
            stopwatch.Stop();
        }
    }

    public Task<TextExtractionResult> ExtractTextAsync(PdfInput input)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // PdfPig nie jest dostępny, zwróć błąd
            return Task.FromResult(
                TextExtractionResult.ErrorResult("PdfPig nie jest dostępny w tej konfiguracji", Name));
        }
        catch (Exception ex)
        {
            return Task.FromResult(TextExtractionResult.ErrorResult($"Błąd podczas ekstrakcji tekstu: {ex.Message}",
                Name));
        }
        finally
        {
            stopwatch.Stop();
        }
    }
}