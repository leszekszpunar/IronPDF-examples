using PdfAdapter.Interfaces;
using PdfAdapter.Models;

namespace PdfAdapter;

/// <summary>
///     Główny serwis adaptera PDF z możliwością wyboru silnika
/// </summary>
public class PdfAdapterService
{
    private readonly string _defaultEngine;
    private readonly Dictionary<string, IPdfEngine> _engines;

    public PdfAdapterService(IEnumerable<IPdfEngine> engines, string defaultEngine = "PdfSharpCore")
    {
        _engines = engines.ToDictionary(e => e.Name, e => e);
        _defaultEngine = defaultEngine;
    }

    /// <summary>
    ///     Pobiera dostępne silniki
    /// </summary>
    public IEnumerable<string> GetAvailableEngines()
    {
        return _engines.Keys;
    }

    /// <summary>
    ///     Pobiera informacje o silniku
    /// </summary>
    public IPdfEngine? GetEngine(string engineName)
    {
        return _engines.TryGetValue(engineName, out var engine) ? engine : null;
    }

    /// <summary>
    ///     Łączy pliki PDF używając określonego silnika
    /// </summary>
    public async Task<PdfResult> MergePdfsAsync(IEnumerable<PdfInput> inputs, string? engineName = null,
        string outputFormat = "A4")
    {
        var engine = GetEngineByName(engineName);

        if (!engine.SupportsMerge)
            return PdfResult.ErrorResult($"Silnik {engine.Name} nie obsługuje łączenia PDF", engine.Name);

        return await engine.MergePdfsAsync(inputs, outputFormat);
    }

    /// <summary>
    ///     Konwertuje obrazy do PDF używając określonego silnika
    /// </summary>
    public async Task<PdfResult> ConvertImagesToPdfAsync(IEnumerable<PdfInput> inputs, string? engineName = null,
        string outputFormat = "A4")
    {
        var engine = GetEngineByName(engineName);

        if (!engine.SupportsImageToPdf)
            return PdfResult.ErrorResult($"Silnik {engine.Name} nie obsługuje konwersji obrazów do PDF", engine.Name);

        return await engine.ConvertImagesToPdfAsync(inputs, outputFormat);
    }

    /// <summary>
    ///     Łączy PDF i obrazy używając określonego silnika
    /// </summary>
    public async Task<PdfResult> MergePdfsAndImagesAsync(IEnumerable<PdfInput> inputs, string? engineName = null,
        string outputFormat = "A4")
    {
        var engine = GetEngineByName(engineName);

        if (!engine.SupportsMerge || !engine.SupportsImageToPdf)
            return PdfResult.ErrorResult($"Silnik {engine.Name} nie obsługuje łączenia PDF i obrazów", engine.Name);

        return await engine.MergePdfsAndImagesAsync(inputs, outputFormat);
    }

    /// <summary>
    ///     Ekstrahuje tekst z PDF używając określonego silnika
    /// </summary>
    public async Task<TextExtractionResult> ExtractTextAsync(PdfInput input, string? engineName = null)
    {
        var engine = GetEngineByName(engineName);

        if (!engine.SupportsTextExtraction)
            return TextExtractionResult.ErrorResult($"Silnik {engine.Name} nie obsługuje ekstrakcji tekstu",
                engine.Name);

        return await engine.ExtractTextAsync(input);
    }

    /// <summary>
    ///     Porównuje wyniki wszystkich dostępnych silników
    /// </summary>
    public async Task<Dictionary<string, PdfResult>> CompareMergePdfsAsync(IEnumerable<PdfInput> inputs,
        string outputFormat = "A4")
    {
        var results = new Dictionary<string, PdfResult>();

        foreach (var engine in _engines.Values.Where(e => e.SupportsMerge))
            try
            {
                var result = await engine.MergePdfsAsync(inputs, outputFormat);
                results[engine.Name] = result;
            }
            catch (Exception ex)
            {
                results[engine.Name] = PdfResult.ErrorResult($"Błąd: {ex.Message}", engine.Name);
            }

        return results;
    }

    /// <summary>
    ///     Porównuje wyniki wszystkich dostępnych silników dla konwersji obrazów
    /// </summary>
    public async Task<Dictionary<string, PdfResult>> CompareConvertImagesAsync(IEnumerable<PdfInput> inputs,
        string outputFormat = "A4")
    {
        var results = new Dictionary<string, PdfResult>();

        foreach (var engine in _engines.Values.Where(e => e.SupportsImageToPdf))
            try
            {
                var result = await engine.ConvertImagesToPdfAsync(inputs, outputFormat);
                results[engine.Name] = result;
            }
            catch (Exception ex)
            {
                results[engine.Name] = PdfResult.ErrorResult($"Błąd: {ex.Message}", engine.Name);
            }

        return results;
    }

    /// <summary>
    ///     Porównuje wyniki wszystkich dostępnych silników dla ekstrakcji tekstu
    /// </summary>
    public async Task<Dictionary<string, TextExtractionResult>> CompareExtractTextAsync(PdfInput input)
    {
        var results = new Dictionary<string, TextExtractionResult>();

        foreach (var engine in _engines.Values.Where(e => e.SupportsTextExtraction))
            try
            {
                var result = await engine.ExtractTextAsync(input);
                results[engine.Name] = result;
            }
            catch (Exception ex)
            {
                results[engine.Name] = TextExtractionResult.ErrorResult($"Błąd: {ex.Message}", engine.Name);
            }

        return results;
    }

    private IPdfEngine GetEngineByName(string? engineName)
    {
        var name = engineName ?? _defaultEngine;

        if (!_engines.TryGetValue(name, out var engine))
            throw new ArgumentException(
                $"Silnik '{name}' nie jest dostępny. Dostępne silniki: {string.Join(", ", _engines.Keys)}");

        return engine;
    }
}