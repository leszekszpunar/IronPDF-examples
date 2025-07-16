using System.Text;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using PdfSharpCore.Pdf.IO;
using PdfSharpService.Models;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;

namespace PdfSharpService.Services;

public class PdfService : IPdfService
{
  private readonly ILogger<PdfService> _logger;
  private readonly string[] _supportedImageExtensions = { ".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif" };
  private readonly string[] _supportedPdfExtensions = { ".pdf" };

  public PdfService(ILogger<PdfService> logger)
  {
    _logger = logger;
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
            var pdfDoc = PdfReader.Open(tempPath, PdfDocumentOpenMode.Import);
            pdfDocuments.Add(pdfDoc);
          }
          catch (Exception ex)
          {
            _logger.LogWarning(ex, $"Nie można otworzyć pliku PDF: {file.FileName}");
            continue;
          }
          tempFiles.Add(tempPath);
        }

        if (pdfDocuments.Count == 0)
          return new FileProcessingResult
          {
            Success = false,
            Message = "Nie znaleziono prawidłowych plików PDF"
          };

        var mergedPdf = new PdfDocument();
        var totalPages = 0;

        foreach (var doc in pdfDocuments)
          for (var i = 0; i < doc.PageCount; i++)
          {
            mergedPdf.AddPage(doc.Pages[i]);
            totalPages++;
          }

        var pdfBytes = GetPdfBytes(mergedPdf);
        var fileName = $"merged_pdfs_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie połączono {pdfDocuments.Count} plików PDF",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = totalPages,
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

        var pdfDocument = new PdfDocument();
        var totalPages = 0;
        var (width, height) = GetPageSize(outputFormat);

        foreach (var imagePath in imagePaths)
          using (var image = Image.Load(imagePath))
          {
            var page = pdfDocument.AddPage();
            page.Width = width;
            page.Height = height;

            // Konwertuj obraz do PDF
            using (var graphics = XGraphics.FromPdfPage(page))
            {
              var rect = new XRect(0, 0, width, height);
              using (var ms = new MemoryStream())
              {
                image.Save(ms, new PngEncoder());
                ms.Position = 0;
                var xImage = XImage.FromStream(() => ms);
                graphics.DrawImage(xImage, rect);
              }
            }

            totalPages++;
          }

        var pdfBytes = GetPdfBytes(pdfDocument);
        var fileName = $"images_to_pdf_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie przekonwertowano {imagePaths.Count} obrazów do PDF",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = totalPages,
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
            try
            {
              var pdfDoc = PdfReader.Open(tempPath, PdfDocumentOpenMode.Import);
              pdfDocuments.Add(pdfDoc);
            }
            catch (Exception ex)
            {
              _logger.LogWarning(ex, $"Nie można otworzyć pliku PDF: {file.FileName}");
              continue;
            }
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
        foreach (var imagePath in imagePaths)
          using (var image = Image.Load(imagePath))
          {
            var page = finalPdf.AddPage();
            page.Width = width;
            page.Height = height;

            using (var graphics = XGraphics.FromPdfPage(page))
            {
              var rect = new XRect(0, 0, width, height);
              using (var ms = new MemoryStream())
              {
                image.Save(ms, new PngEncoder());
                ms.Position = 0;
                var xImage = XImage.FromStream(() => ms);
                graphics.DrawImage(xImage, rect);
              }
            }

            totalPages++;
          }

        var pdfBytes = GetPdfBytes(finalPdf);
        var fileName = $"merged_pdfs_and_images_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

        return new FileProcessingResult
        {
          Success = true,
          Message = $"Pomyślnie połączono {pdfDocuments.Count} plików PDF i {imagePaths.Count} obrazów",
          PdfContent = pdfBytes,
          FileName = fileName,
          TotalPages = totalPages,
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

        var pdfDocument = PdfReader.Open(tempPath, PdfDocumentOpenMode.ReadOnly);
        var extractedText = new StringBuilder();

        for (var i = 0; i < pdfDocument.PageCount; i++)
        {
          var page = pdfDocument.Pages[i];
          // PdfSharpCore nie ma wbudowanej ekstrakcji tekstu, więc zwracamy informację o tym
          extractedText.AppendLine(
              $"Strona {i + 1}: Tekst nie jest dostępny w tej wersji (PdfSharpCore nie obsługuje ekstrakcji tekstu)");
        }

        return new FileProcessingResult
        {
          Success = true,
          Message = "Uwaga: PdfSharpCore nie obsługuje ekstrakcji tekstu z PDF",
          PdfContent = Encoding.UTF8.GetBytes(extractedText.ToString()),
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

  private byte[] GetPdfBytes(PdfDocument document)
  {
    using (var memoryStream = new MemoryStream())
    {
      document.Save(memoryStream);
      return memoryStream.ToArray();
    }
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
}