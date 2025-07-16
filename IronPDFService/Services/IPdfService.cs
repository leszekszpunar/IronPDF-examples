using IronPDFService.Models;

namespace IronPDFService.Services;

public interface IPdfService
{
    Task<FileProcessingResult> MergePdfFilesAsync(IFormFileCollection pdfFiles, string outputFormat = "A4");
    Task<FileProcessingResult> ConvertImagesToPdfAsync(IFormFileCollection imageFiles, string outputFormat = "A4");
    Task<FileProcessingResult> MergePdfsAndImagesAsync(IFormFileCollection files, string outputFormat = "A4");
    Task<FileProcessingResult> ExtractTextFromPdfAsync(IFormFile pdfFile);
}