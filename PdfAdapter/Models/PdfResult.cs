namespace PdfAdapter.Models;

/// <summary>
///     Wynik operacji PDF
/// </summary>
public class PdfResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public byte[]? PdfContent { get; set; }
    public string? FileName { get; set; }
    public int TotalPages { get; set; }
    public long FileSize { get; set; }
    public TimeSpan ProcessingTime { get; set; }
    public string? Engine { get; set; }

    public static PdfResult SuccessResult(byte[] content, string fileName, int pages, string engine,
        TimeSpan processingTime)
    {
        return new PdfResult
        {
            Success = true,
            PdfContent = content,
            FileName = fileName,
            TotalPages = pages,
            FileSize = content.Length,
            Engine = engine,
            ProcessingTime = processingTime
        };
    }

    public static PdfResult ErrorResult(string message, string? engine = null)
    {
        return new PdfResult
        {
            Success = false,
            Message = message,
            Engine = engine
        };
    }
}

/// <summary>
///     Wynik ekstrakcji tekstu
/// </summary>
public class TextExtractionResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? ExtractedText { get; set; }
    public int TotalPages { get; set; }
    public TimeSpan ProcessingTime { get; set; }
    public string? Engine { get; set; }

    public static TextExtractionResult SuccessResult(string text, int pages, string engine, TimeSpan processingTime)
    {
        return new TextExtractionResult
        {
            Success = true,
            ExtractedText = text,
            TotalPages = pages,
            Engine = engine,
            ProcessingTime = processingTime
        };
    }

    public static TextExtractionResult ErrorResult(string message, string? engine = null)
    {
        return new TextExtractionResult
        {
            Success = false,
            Message = message,
            Engine = engine
        };
    }
}