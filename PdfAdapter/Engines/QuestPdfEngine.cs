using System.Diagnostics;
using PdfAdapter.Interfaces;
using PdfAdapter.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using SixLabors.ImageSharp.Formats.Png;
using Image = SixLabors.ImageSharp.Image;

namespace PdfAdapter.Engines;

/// <summary>
///     Silnik PDF oparty na QuestPDF
/// </summary>
public class QuestPdfEngine : IPdfEngine
{
    public string Name => "QuestPDF";
    public bool SupportsMerge => false; // QuestPDF nie obsługuje merge istniejących PDF
    public bool SupportsImageToPdf => true;
    public bool SupportsTextExtraction => false; // QuestPDF nie obsługuje ekstrakcji tekstu

    public Task<PdfResult> MergePdfsAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            return Task.FromResult(PdfResult.ErrorResult("QuestPDF nie obsługuje łączenia istniejących plików PDF",
                Name));
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

    public async Task<PdfResult> ConvertImagesToPdfAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var imageInputs = inputs.ToList();
            if (!imageInputs.Any()) return PdfResult.ErrorResult("Nie przekazano żadnych obrazów", Name);

            var pageSize = GetPageSize(outputFormat);
            var fileName = $"questpdf_images_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(pageSize);
                    page.Margin(1, Unit.Centimetre);

                    foreach (var input in imageInputs)
                        page.Content().Column(col =>
                        {
                            using var stream = input.GetStream();
                            using var image = Image.Load(stream);

                            // Konwertuj obraz do PNG dla QuestPDF
                            using var pngStream = new MemoryStream();
                            image.Save(pngStream, new PngEncoder());
                            pngStream.Position = 0;

                            col.Item().Image(pngStream.ToArray(), ImageScaling.FitArea);
                        });
                });
            }).GeneratePdf();

            stopwatch.Stop();
            return PdfResult.SuccessResult(pdfBytes, fileName, imageInputs.Count, Name, stopwatch.Elapsed);
        }
        catch (Exception ex)
        {
            return PdfResult.ErrorResult($"Błąd podczas konwersji obrazów do PDF: {ex.Message}", Name);
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
            return Task.FromResult(PdfResult.ErrorResult("QuestPDF nie obsługuje łączenia istniejących plików PDF",
                Name));
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
            return Task.FromResult(TextExtractionResult.ErrorResult("QuestPDF nie obsługuje ekstrakcji tekstu z PDF",
                Name));
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

    private PageSize GetPageSize(string format)
    {
        return format.ToUpper() switch
        {
            "A3" => PageSizes.A3,
            "A5" => PageSizes.A5,
            "LETTER" => PageSizes.Letter,
            _ => PageSizes.A4
        };
    }
}