using System.ComponentModel.DataAnnotations;

namespace IronPDFService.Models;

public class FileUploadRequest
{
    [Required] public IFormFileCollection Files { get; set; } = null!;

    public string? OutputFormat { get; set; } = "A4";

    public bool MergeAsSinglePage { get; set; } = false;
}