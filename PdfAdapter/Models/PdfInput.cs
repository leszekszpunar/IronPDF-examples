namespace PdfAdapter.Models;

/// <summary>
///     Reprezentuje różne typy wejścia dla operacji PDF
/// </summary>
public abstract class PdfInput
{
    public string? FileName { get; set; }
    public string? ContentType { get; set; }

    public abstract Stream GetStream();
    public abstract byte[] GetBytes();
}

/// <summary>
///     Wejście z pliku
/// </summary>
public class FilePdfInput : PdfInput
{
    private readonly string _filePath;

    public FilePdfInput(string filePath)
    {
        _filePath = filePath;
        FileName = Path.GetFileName(filePath);
    }

    public override Stream GetStream()
    {
        return File.OpenRead(_filePath);
    }

    public override byte[] GetBytes()
    {
        return File.ReadAllBytes(_filePath);
    }
}

/// <summary>
///     Wejście ze streamu
/// </summary>
public class StreamPdfInput : PdfInput
{
    private readonly bool _disposeStream;
    private readonly Stream _stream;

    public StreamPdfInput(Stream stream, bool disposeStream = false)
    {
        _stream = stream;
        _disposeStream = disposeStream;
    }

    public override Stream GetStream()
    {
        return _stream;
    }

    public override byte[] GetBytes()
    {
        if (_stream is MemoryStream ms) return ms.ToArray();

        var memoryStream = new MemoryStream();
        _stream.CopyTo(memoryStream);
        return memoryStream.ToArray();
    }
}

/// <summary>
///     Wejście z bajtów
/// </summary>
public class BytesPdfInput : PdfInput
{
    private readonly byte[] _bytes;

    public BytesPdfInput(byte[] bytes)
    {
        _bytes = bytes;
    }

    public override Stream GetStream()
    {
        return new MemoryStream(_bytes);
    }

    public override byte[] GetBytes()
    {
        return _bytes;
    }
}