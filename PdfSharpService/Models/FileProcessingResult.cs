namespace PdfSharpService.Models;

public class FileProcessingResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public byte[]? PdfContent { get; set; }
    public string? FileName { get; set; }
    public int TotalPages { get; set; }
    public long FileSize { get; set; }
}