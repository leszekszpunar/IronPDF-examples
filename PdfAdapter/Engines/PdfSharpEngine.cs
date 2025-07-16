using System.Diagnostics;
using PdfAdapter.Interfaces;
using PdfAdapter.Models;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;

namespace PdfAdapter.Engines;

/// <summary>
///     Silnik PDF oparty na PdfSharpCore
/// </summary>
public class PdfSharpEngine : IPdfEngine
{
    public string Name => "PdfSharpCore";
    public bool SupportsMerge => true;
    public bool SupportsImageToPdf => true;
    public bool SupportsTextExtraction => false; // PdfSharpCore nie obsługuje ekstrakcji tekstu

    public async Task<PdfResult> MergePdfsAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var pdfInputs = inputs.ToList();
            if (!pdfInputs.Any()) return PdfResult.ErrorResult("Nie przekazano żadnych plików PDF", Name);

            var pdfDocuments = new List<PdfDocument>();
            var tempFiles = new List<string>();

            try
            {
                foreach (var input in pdfInputs)
                {
                    var tempPath = Path.GetTempFileName();
                    await File.WriteAllBytesAsync(tempPath, input.GetBytes());

                    var pdfDoc = PdfReader.Open(tempPath, PdfDocumentOpenMode.Import);
                    pdfDocuments.Add(pdfDoc);
                    tempFiles.Add(tempPath);
                }

                var mergedPdf = new PdfDocument();
                var totalPages = 0;

                foreach (var doc in pdfDocuments)
                    for (var i = 0; i < doc.PageCount; i++)
                    {
                        mergedPdf.AddPage(doc.Pages[i]);
                        totalPages++;
                    }

                var pdfBytes = GetPdfBytes(mergedPdf);
                var fileName = $"pdfsharp_merged_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

                stopwatch.Stop();
                return PdfResult.SuccessResult(pdfBytes, fileName, totalPages, Name, stopwatch.Elapsed);
            }
            finally
            {
                foreach (var doc in pdfDocuments) doc.Dispose();
                foreach (var tempFile in tempFiles)
                    if (File.Exists(tempFile))
                        File.Delete(tempFile);
            }
        }
        catch (Exception ex)
        {
            return PdfResult.ErrorResult($"Błąd podczas łączenia PDF: {ex.Message}", Name);
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

            var pdfDocument = new PdfDocument();
            var totalPages = 0;
            var (width, height) = GetPageSize(outputFormat);

            foreach (var input in imageInputs)
            {
                using var stream = input.GetStream();
                using var image = Image.Load(stream);

                var page = pdfDocument.AddPage();
                page.Width = width;
                page.Height = height;

                using (var graphics = XGraphics.FromPdfPage(page))
                {
                    var rect = new XRect(0, 0, width, height);

                    // Konwertuj obraz do PNG dla PdfSharpCore
                    using var pngStream = new MemoryStream();
                    image.Save(pngStream, new PngEncoder());
                    pngStream.Position = 0;

                    var xImage = XImage.FromStream(() => pngStream);
                    graphics.DrawImage(xImage, rect);
                }

                totalPages++;
            }

            var pdfBytes = GetPdfBytes(pdfDocument);
            var fileName = $"pdfsharp_images_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

            stopwatch.Stop();
            return PdfResult.SuccessResult(pdfBytes, fileName, totalPages, Name, stopwatch.Elapsed);
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

    public async Task<PdfResult> MergePdfsAndImagesAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4")
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var allInputs = inputs.ToList();
            if (!allInputs.Any()) return PdfResult.ErrorResult("Nie przekazano żadnych plików", Name);

            var pdfDocuments = new List<PdfDocument>();
            var imageInputs = new List<PdfInput>();
            var tempFiles = new List<string>();

            foreach (var input in allInputs)
            {
                var extension = Path.GetExtension(input.FileName ?? "").ToLower();

                if (extension == ".pdf")
                {
                    var tempPath = Path.GetTempFileName();
                    await File.WriteAllBytesAsync(tempPath, input.GetBytes());

                    var pdfDoc = PdfReader.Open(tempPath, PdfDocumentOpenMode.Import);
                    pdfDocuments.Add(pdfDoc);
                    tempFiles.Add(tempPath);
                }
                else if (IsImageFile(extension))
                {
                    imageInputs.Add(input);
                }
            }

            if (!pdfDocuments.Any() && !imageInputs.Any())
                return PdfResult.ErrorResult("Nie znaleziono prawidłowych plików PDF ani obrazów", Name);

            var finalPdf = new PdfDocument();
            var totalPages = 0;
            var (width, height) = GetPageSize(outputFormat);

            // Dodaj strony z PDF-ów
            foreach (var doc in pdfDocuments)
                for (var i = 0; i < doc.PageCount; i++)
                {
                    finalPdf.AddPage(doc.Pages[i]);
                    totalPages++;
                }

            // Dodaj obrazy jako strony
            foreach (var input in imageInputs)
            {
                using var stream = input.GetStream();
                using var image = Image.Load(stream);

                var page = finalPdf.AddPage();
                page.Width = width;
                page.Height = height;

                using (var graphics = XGraphics.FromPdfPage(page))
                {
                    var rect = new XRect(0, 0, width, height);

                    // Konwertuj obraz do PNG dla PdfSharpCore
                    using var pngStream = new MemoryStream();
                    image.Save(pngStream, new PngEncoder());
                    pngStream.Position = 0;

                    var xImage = XImage.FromStream(() => pngStream);
                    graphics.DrawImage(xImage, rect);
                }

                totalPages++;
            }

            var pdfBytes = GetPdfBytes(finalPdf);
            var fileName = $"pdfsharp_merged_all_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

            stopwatch.Stop();
            return PdfResult.SuccessResult(pdfBytes, fileName, totalPages, Name, stopwatch.Elapsed);
        }
        catch (Exception ex)
        {
            return PdfResult.ErrorResult($"Błąd podczas łączenia PDF i obrazów: {ex.Message}", Name);
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
            return Task.FromResult(
                TextExtractionResult.ErrorResult("PdfSharpCore nie obsługuje ekstrakcji tekstu z PDF", Name));
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

    private byte[] GetPdfBytes(PdfDocument document)
    {
        using var memoryStream = new MemoryStream();
        document.Save(memoryStream);
        return memoryStream.ToArray();
    }

    private (double width, double height) GetPageSize(string format)
    {
        return format.ToUpper() switch
        {
            "A3" => (841.89, 1190.55),
            "A5" => (419.53, 595.28),
            "LETTER" => (612, 792),
            _ => (595.28, 841.89) // A4
        };
    }

    private bool IsImageFile(string extension)
    {
        var imageExtensions = new[] { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif" };
        return imageExtensions.Contains(extension.ToLower());
    }
}