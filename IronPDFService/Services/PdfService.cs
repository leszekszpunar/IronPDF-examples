using System.Text;
using IronPdf.Rendering;
using IronPDFService.Models;
using IronPdf;

namespace IronPDFService.Services;

public class PdfService : IPdfService
{
  private readonly ILogger<PdfService> _logger;
  private readonly string[] _supportedImageExtensions = { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif" };
  private readonly string[] _supportedPdfExtensions = { ".pdf" };

  public PdfService(ILogger<PdfService> logger)
  {
    _logger = logger;

    // Configure IronPDF for macOS compatibility
    try
    {
      // Set custom temp directory to avoid MIME type issues
      var tempDir = Path.Combine(Path.GetTempPath(), "IronPDF");
      Directory.CreateDirectory(tempDir);
      Environment.SetEnvironmentVariable("TEMP", tempDir);
      Environment.SetEnvironmentVariable("TMP", tempDir);

      // Set MIME type mapping for macOS
      Environment.SetEnvironmentVariable("IRONPDF_MIME_TYPES", "true");

      _logger.LogInformation("IronPDF temp directory configured: {TempDir}", tempDir);
    }
    catch (Exception ex)
    {
      _logger.LogWarning(ex, "IronPDF configuration warning - continuing anyway");
    }
  }

  public async Task<FileProcessingResult> MergePdfFilesAsync(IFormFileCollection pdfFiles, string outputFormat = "A4")
  {
    try
    {
      if (pdfFiles == null || pdfFiles.Count == 0)
        return new FileProcessingResult
        {
          Success = false,
          Message = "Nie przekazano żadnych plików PDF"
        };

      var pdfDocuments = new List<PdfDocument>();
      var tempFiles = new List<string>();

      try
      {
        foreach (var file in pdfFiles)
        {
          if (!_supportedPdfExtensions.Contains(Path.GetExtension(file.FileName).ToLower())) continue;

          var tempPath = Path.GetTempFileName();
          using (var stream = new FileStream(tempPath, FileMode.Create))
          {
            await file.CopyToAsync(stream);
          }

          try
          {
            var pdfDoc = IronPdf.PdfDocument.FromFile(tempPath);
            pdfDocuments.Add(pdfDoc);
            tempFiles.Add(tempPath);
          }
          catch (Exception mimeEx) when (mimeEx.Message.Contains("mime type"))
          {
            _logger.LogWarning(mimeEx, "Błąd MIME type dla pliku {FileName}, pomijam", file.FileName);
            continue;
          }
        }

        if (pdfDocuments.Count == 0)
          return new FileProcessingResult
          {
            Success = false,
            Message = "Nie znaleziono prawidłowych plików PDF"
          };

        var mergedPdf = PdfDocument.Merge(pdfDocuments);
        ConfigurePageSize(mergedPdf, outputFormat);

        var pdfBytes = mergedPdf.Stream.ToArray();
        var fileName = $"merged_pdfs_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie połączono {pdfDocuments.Count} plików PDF",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = mergedPdf.PageCount,
          FileSize = pdfBytes.Length
        };
      }
      finally
      {
        // Cleanup
        foreach (var doc in pdfDocuments) doc.Dispose();
        foreach (var tempFile in tempFiles)
          if (File.Exists(tempFile))
            File.Delete(tempFile);
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Błąd podczas łączenia plików PDF");
      return new FileProcessingResult
      {
        Success = false,
        Message = $"Błąd podczas łączenia plików PDF: {ex.Message}"
      };
    }
  }

  public async Task<FileProcessingResult> ConvertImagesToPdfAsync(IFormFileCollection imageFiles,
      string outputFormat = "A4")
  {
    try
    {
      if (imageFiles == null || imageFiles.Count == 0)
        return new FileProcessingResult
        {
          Success = false,
          Message = "Nie przekazano żadnych plików obrazów"
        };

      var tempFiles = new List<string>();
      var imagePaths = new List<string>();

      try
      {
        foreach (var file in imageFiles)
        {
          if (!_supportedImageExtensions.Contains(Path.GetExtension(file.FileName).ToLower())) continue;

          var tempPath = Path.GetTempFileName();
          using (var stream = new FileStream(tempPath, FileMode.Create))
          {
            await file.CopyToAsync(stream);
          }

          imagePaths.Add(tempPath);
          tempFiles.Add(tempPath);
        }

        if (imagePaths.Count == 0)
          return new FileProcessingResult
          {
            Success = false,
            Message = "Nie znaleziono prawidłowych plików obrazów"
          };

        var pdfDocuments = new List<PdfDocument>();
        foreach (var imagePath in imagePaths)
        {
          try
          {
            var renderer = new ChromePdfRenderer();
            ConfigurePageSize(renderer, outputFormat);
            var html = $"<img src='{imagePath}' style='width: 100%; height: 100%; object-fit: contain;' />";
            var singleImagePdf = renderer.RenderHtmlAsPdf(html);
            pdfDocuments.Add(singleImagePdf);
          }
          catch (Exception mimeEx) when (mimeEx.Message.Contains("mime type"))
          {
            _logger.LogWarning(mimeEx, "Błąd MIME type dla obrazu {ImagePath}, pomijam", imagePath);
            continue;
          }
        }

        var pdfDocument = PdfDocument.Merge(pdfDocuments);
        var pdfBytes = pdfDocument.Stream.ToArray();
        var fileName = $"images_to_pdf_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie przekonwertowano {imagePaths.Count} obrazów do PDF",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = pdfDocument.PageCount,
          FileSize = pdfBytes.Length
        };
      }
      finally
      {
        foreach (var tempFile in tempFiles)
          if (File.Exists(tempFile))
            File.Delete(tempFile);
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Błąd podczas konwersji obrazów do PDF");
      return new FileProcessingResult
      {
        Success = false,
        Message = $"Błąd podczas konwersji obrazów do PDF: {ex.Message}"
      };
    }
  }

  public async Task<FileProcessingResult> MergePdfsAndImagesAsync(IFormFileCollection files,
      string outputFormat = "A4")
  {
    try
    {
      if (files == null || files.Count == 0)
        return new FileProcessingResult
        {
          Success = false,
          Message = "Nie przekazano żadnych plików"
        };

      var pdfDocuments = new List<PdfDocument>();
      var imagePaths = new List<string>();
      var tempFiles = new List<string>();

      try
      {
        foreach (var file in files)
        {
          var extension = Path.GetExtension(file.FileName).ToLower();
          var tempPath = Path.GetTempFileName();

          using (var stream = new FileStream(tempPath, FileMode.Create))
          {
            await file.CopyToAsync(stream);
          }

          if (_supportedPdfExtensions.Contains(extension))
          {
            var pdfDoc = PdfDocument.FromFile(tempPath);
            pdfDocuments.Add(pdfDoc);
          }
          else if (_supportedImageExtensions.Contains(extension))
          {
            imagePaths.Add(tempPath);
          }

          tempFiles.Add(tempPath);
        }

        if (pdfDocuments.Count == 0 && imagePaths.Count == 0)
          return new FileProcessingResult
          {
            Success = false,
            Message = "Nie znaleziono prawidłowych plików PDF ani obrazów"
          };

        var finalPdfDocuments = new List<PdfDocument>();

        // Dodaj PDF-y
        finalPdfDocuments.AddRange(pdfDocuments);

        // Konwertuj obrazy do PDF i dodaj
        if (imagePaths.Count > 0)
        {
          var imagePdfDocuments = new List<PdfDocument>();
          foreach (var imagePath in imagePaths)
          {
            var renderer = new ChromePdfRenderer();
            ConfigurePageSize(renderer, outputFormat);
            var html = $"<img src='{imagePath}' style='width: 100%; height: 100%; object-fit: contain;' />";
            var singleImagePdf = renderer.RenderHtmlAsPdf(html);
            imagePdfDocuments.Add(singleImagePdf);
          }

          var imagesPdf = PdfDocument.Merge(imagePdfDocuments);
          finalPdfDocuments.Add(imagesPdf);
        }

        var mergedPdf = PdfDocument.Merge(finalPdfDocuments);
        ConfigurePageSize(mergedPdf, outputFormat);

        var pdfBytes = mergedPdf.Stream.ToArray();
        var fileName = $"merged_pdfs_and_images_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie połączono {pdfDocuments.Count} plików PDF i {imagePaths.Count} obrazów",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = mergedPdf.PageCount,
          FileSize = pdfBytes.Length
        };
      }
      finally
      {
        // Cleanup
        foreach (var doc in pdfDocuments) doc.Dispose();
        foreach (var tempFile in tempFiles)
          if (File.Exists(tempFile))
            File.Delete(tempFile);
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Błąd podczas łączenia plików PDF i obrazów");
      return new FileProcessingResult
      {
        Success = false,
        Message = $"Błąd podczas łączenia plików PDF i obrazów: {ex.Message}"
      };
    }
  }

  public async Task<FileProcessingResult> ExtractTextFromPdfAsync(IFormFile pdfFile)
  {
    try
    {
      if (pdfFile == null)
        return new FileProcessingResult
        {
          Success = false,
          Message = "Nie przekazano pliku PDF"
        };

      if (!_supportedPdfExtensions.Contains(Path.GetExtension(pdfFile.FileName).ToLower()))
        return new FileProcessingResult
        {
          Success = false,
          Message = "Przekazany plik nie jest plikiem PDF"
        };

      var tempPath = Path.GetTempFileName();
      try
      {
        using (var stream = new FileStream(tempPath, FileMode.Create))
        {
          await pdfFile.CopyToAsync(stream);
        }

        var pdfDocument = PdfDocument.FromFile(tempPath);
        var extractedText = pdfDocument.ExtractAllText();

        return new FileProcessingResult
        {
          Success = true,
          Message = "Pomyślnie wyekstrahowano tekst z pliku PDF",
          PdfContent = Encoding.UTF8.GetBytes(extractedText),
          FileName = $"{Path.GetFileNameWithoutExtension(pdfFile.FileName)}_extracted_text.txt",
          TotalPages = pdfDocument.PageCount,
          FileSize = extractedText.Length
        };
      }
      finally
      {
        if (File.Exists(tempPath))
          File.Delete(tempPath);
      }
    }
    catch (Exception ex)
    {
      _logger.LogError(ex, "Błąd podczas ekstrakcji tekstu z PDF");
      return new FileProcessingResult
      {
        Success = false,
        Message = $"Błąd podczas ekstrakcji tekstu z PDF: {ex.Message}"
      };
    }
  }

  private void ConfigurePageSize(ChromePdfRenderer renderer, string format)
  {
    switch (format.ToUpper())
    {
      case "A4":
        renderer.RenderingOptions.PaperSize = PdfPaperSize.A4;
        break;
      case "A3":
        renderer.RenderingOptions.PaperSize = PdfPaperSize.A3;
        break;
      case "A5":
        renderer.RenderingOptions.PaperSize = PdfPaperSize.A5;
        break;
      case "LETTER":
        renderer.RenderingOptions.PaperSize = PdfPaperSize.Letter;
        break;
      default:
        renderer.RenderingOptions.PaperSize = PdfPaperSize.A4;
        break;
    }
  }

  private void ConfigurePageSize(PdfDocument document, string format)
  {
    // Dla istniejących dokumentów PDF, możemy tylko ustawić orientację
    // Rozmiar strony jest już zdefiniowany w dokumencie
    switch (format.ToUpper())
    {
      case "A4":
      case "A3":
      case "A5":
      case "LETTER":
        // Zachowujemy oryginalny rozmiar strony
        break;
    }
  }
}