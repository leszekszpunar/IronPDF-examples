using PdfAdapter.Models;

namespace PdfAdapter.Interfaces;

/// <summary>
///     Interfejs dla silnika PDF
/// </summary>
public interface IPdfEngine
{
    string Name { get; }
    bool SupportsMerge { get; }
    bool SupportsImageToPdf { get; }
    bool SupportsTextExtraction { get; }

    Task<PdfResult> MergePdfsAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4");
    Task<PdfResult> ConvertImagesToPdfAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4");
    Task<PdfResult> MergePdfsAndImagesAsync(IEnumerable<PdfInput> inputs, string outputFormat = "A4");
    Task<TextExtractionResult> ExtractTextAsync(PdfInput input);
}