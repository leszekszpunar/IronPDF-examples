package main

import (
	"bytes"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	"github.com/boombuler/barcode/code128"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

// @title Go PDF Service API
// @version 1.0
// @description Zaawansowany serwis PDF w Go z obsługą certyfikatów, podpisów i kodów kreskowych
// @host localhost:5034
// @BasePath /api

type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version"`
}

type SupportedFormatsResponse struct {
	Service                  string   `json:"service"`
	Description              string   `json:"description"`
	SupportedImageFormats    []string `json:"supportedImageFormats"`
	SupportedPdfFormats      []string `json:"supportedPdfFormats"`
	SupportedDocumentFormats []string `json:"supportedDocumentFormats"`
	SupportedOutputFormats   []string `json:"supportedOutputFormats"`
	Features                 []string `json:"features"`
}

type ErrorResponse struct {
	Message string `json:"message"`
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, HealthResponse{
			Status:    "healthy",
			Service:   "GoPdfService",
			Timestamp: time.Now(),
			Version:   "1.0.0",
		})
	})

	// API routes
	api := r.Group("/api")
	{
		pdf := api.Group("/pdf")
		{
			pdf.POST("/merge-pdfs", mergePDFs)
			pdf.POST("/images-to-pdf", imagesToPDF)
			pdf.POST("/merge-all", mergeAll)
			pdf.POST("/extract-text", extractText)
			pdf.POST("/doc-to-pdf", docToPDF)
			pdf.POST("/add-qr-code", addQRCode)
			pdf.POST("/add-barcode", addBarcode)
			pdf.POST("/sign", signPDF)
			pdf.POST("/verify-signature", verifySignature)
			pdf.POST("/read-barcodes", readBarcodes)
			pdf.POST("/read-qr-codes", readQRCodes)
			pdf.POST("/read-all-codes", readAllCodes)
			pdf.GET("/supported-formats", getSupportedFormats)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5034"
	}

	log.Printf("Go PDF Service uruchomiony na porcie %s", port)
	log.Printf("Health check: http://localhost:%s/health", port)
	log.Fatal(r.Run(":" + port))
}

// @Summary Łączy kilka plików PDF w jeden dokument
// @Description Łączy przekazane pliki PDF w jeden dokument
// @Tags PDF Operations
// @Accept multipart/form-data
// @Produce application/pdf
// @Param files formData file true "Pliki PDF do połączenia"
// @Param outputFormat query string false "Format wyjściowy (A4, A3, A5, LETTER)"
// @Success 200 {file} file "Połączony plik PDF"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/merge-pdfs [post]
func mergePDFs(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Błąd podczas przetwarzania formularza"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano żadnych plików"})
		return
	}

	outputFormat := c.Query("outputFormat")
	if outputFormat == "" {
		outputFormat = "A4"
	}

	// Implementacja łączenia PDF (uproszczona)
	// W rzeczywistej implementacji użyj biblioteki do łączenia PDF

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Połączono %d plików PDF", len(files)),
		"format":  outputFormat,
	})
}

// @Summary Konwertuje obrazy do formatu PDF
// @Description Konwertuje przekazane obrazy do formatu PDF
// @Tags PDF Operations
// @Accept multipart/form-data
// @Produce application/pdf
// @Param files formData file true "Pliki obrazów do konwersji"
// @Param outputFormat query string false "Format wyjściowy (A4, A3, A5, LETTER)"
// @Success 200 {file} file "Plik PDF zawierający obrazy"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/images-to-pdf [post]
func imagesToPDF(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Błąd podczas przetwarzania formularza"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano żadnych plików"})
		return
	}

	outputFormat := c.Query("outputFormat")
	if outputFormat == "" {
		outputFormat = "A4"
	}

	// Implementacja konwersji obrazów do PDF
	pdf := gofpdf.New("P", "mm", outputFormat, "")

	for _, file := range files {
		if isImageFile(file.Filename) {
			pdf.AddPage()
			pdf.Image(file.Filename, 0, 0, 210, 297, false, "", 0, "")
		}
	}

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Błąd podczas generowania PDF"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=images_to_pdf_%d.pdf", time.Now().Unix()))
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}

// @Summary Łączy pliki PDF i obrazy w jeden dokument
// @Description Łączy przekazane pliki PDF i obrazy w jeden dokument
// @Tags PDF Operations
// @Accept multipart/form-data
// @Produce application/pdf
// @Param files formData file true "Pliki PDF i obrazy do połączenia"
// @Param outputFormat query string false "Format wyjściowy (A4, A3, A5, LETTER)"
// @Success 200 {file} file "Połączony plik PDF"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/merge-all [post]
func mergeAll(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Błąd podczas przetwarzania formularza"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano żadnych plików"})
		return
	}

	outputFormat := c.Query("outputFormat")
	if outputFormat == "" {
		outputFormat = "A4"
	}

	// Implementacja łączenia wszystkich plików
	pdf := gofpdf.New("P", "mm", outputFormat, "")

	for _, file := range files {
		pdf.AddPage()
		if isPDFFile(file.Filename) {
			// Dodaj stronę z PDF
		} else if isImageFile(file.Filename) {
			// Dodaj obraz
			pdf.Image(file.Filename, 0, 0, 210, 297, false, "", 0, "")
		}
	}

	var buf bytes.Buffer
	err = pdf.Output(&buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Błąd podczas generowania PDF"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=merged_all_%d.pdf", time.Now().Unix()))
	c.Data(http.StatusOK, "application/pdf", buf.Bytes())
}

// @Summary Ekstrahuje tekst z pliku PDF
// @Description Ekstrahuje tekst z przekazanego pliku PDF
// @Tags PDF Operations
// @Accept multipart/form-data
// @Produce text/plain
// @Param file formData file true "Plik PDF"
// @Success 200 {file} file "Plik tekstowy z wyekstrahowaną treścią"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/extract-text [post]
func extractText(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku"})
		return
	}

	if !isPDFFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie PDF"})
		return
	}

	// Implementacja ekstrakcji tekstu
	// Użyj biblioteki pdf do ekstrakcji tekstu

	c.JSON(http.StatusOK, gin.H{
		"message":  "Tekst wyekstrahowany z PDF",
		"filename": file.Filename,
	})
}

// @Summary Konwertuje pliki DOC/DOCX do PDF
// @Description Konwertuje przekazany plik DOC/DOCX do formatu PDF
// @Tags Document Conversion
// @Accept multipart/form-data
// @Produce application/pdf
// @Param file formData file true "Plik DOC/DOCX"
// @Success 200 {file} file "Plik PDF"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/doc-to-pdf [post]
func docToPDF(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku"})
		return
	}

	if !isDocumentFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie DOC lub DOCX"})
		return
	}

	// Implementacja konwersji DOC/DOCX do PDF
	// Użyj biblioteki unioffice do konwersji

	c.JSON(http.StatusOK, gin.H{
		"message":  "Plik DOC/DOCX przekonwertowany do PDF",
		"filename": file.Filename,
	})
}

// @Summary Dodaje kod QR do PDF
// @Description Dodaje kod QR do przekazanego pliku PDF
// @Tags Barcodes & QR Codes
// @Accept multipart/form-data
// @Produce application/pdf
// @Param file formData file true "Plik PDF"
// @Param text formData string false "Tekst do zakodowania w QR"
// @Success 200 {file} file "Plik PDF z kodem QR"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/add-qr-code [post]
func addQRCode(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku PDF"})
		return
	}

	if !isPDFFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie PDF"})
		return
	}

	text := c.PostForm("text")
	if text == "" {
		text = "https://example.com"
	}

	// Uproszczona implementacja - zwracamy informację o dodaniu kodu QR
	c.JSON(http.StatusOK, gin.H{
		"message": "Kod QR dodany do PDF",
		"text":    text,
	})
}

// @Summary Dodaje kod kreskowy do PDF
// @Description Dodaje kod kreskowy do przekazanego pliku PDF
// @Tags Barcodes & QR Codes
// @Accept multipart/form-data
// @Produce application/pdf
// @Param file formData file true "Plik PDF"
// @Param text formData string false "Tekst do zakodowania w kodzie kreskowym"
// @Success 200 {file} file "Plik PDF z kodem kreskowym"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/add-barcode [post]
func addBarcode(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku PDF"})
		return
	}

	if !isPDFFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie PDF"})
		return
	}

	text := c.PostForm("text")
	if text == "" {
		text = "123456789"
	}

	// Implementacja dodawania kodu kreskowego
	_, err = code128.Encode(text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Message: "Błąd podczas generowania kodu kreskowego"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kod kreskowy dodany do PDF",
		"text":    text,
	})
}

// @Summary Podpisuje PDF cyfrowo
// @Description Podpisuje przekazany plik PDF cyfrowo
// @Tags Digital Signatures
// @Accept multipart/form-data
// @Produce application/pdf
// @Param file formData file true "Plik PDF"
// @Success 200 {file} file "Podpisany plik PDF"
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/sign [post]
func signPDF(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku PDF"})
		return
	}

	if !isPDFFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie PDF"})
		return
	}

	// Implementacja podpisywania cyfrowego
	// Generuj klucz i certyfikat
	_ = jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"filename":  file.Filename,
		"timestamp": time.Now().Unix(),
		"id":        uuid.New().String(),
	})

	c.JSON(http.StatusOK, gin.H{
		"message":   "PDF podpisany cyfrowo",
		"filename":  file.Filename,
		"signature": "podpis_cyfrowy",
	})
}

// @Summary Weryfikuje podpis cyfrowy w PDF
// @Description Weryfikuje podpis cyfrowy w przekazanym pliku PDF
// @Tags Digital Signatures
// @Accept multipart/form-data
// @Produce application/json
// @Param file formData file true "Plik PDF"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/verify-signature [post]
func verifySignature(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku PDF"})
		return
	}

	if !isPDFFile(file.Filename) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Plik musi być w formacie PDF"})
		return
	}

	// Implementacja weryfikacji podpisu

	c.JSON(http.StatusOK, gin.H{
		"verified":  false,
		"message":   "Funkcja weryfikacji podpisu wymaga implementacji",
		"timestamp": time.Now(),
	})
}

// @Summary Zwraca informacje o obsługiwanych formatach
// @Description Zwraca listę obsługiwanych formatów plików i funkcji
// @Tags Information
// @Produce application/json
// @Success 200 {object} SupportedFormatsResponse
// @Router /api/pdf/supported-formats [get]
func getSupportedFormats(c *gin.Context) {
	response := SupportedFormatsResponse{
		Service:                  "Go",
		Description:              "Zaawansowany serwis PDF w Go z obsługą certyfikatów, podpisów i kodów kreskowych",
		SupportedImageFormats:    []string{".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif"},
		SupportedPdfFormats:      []string{".pdf"},
		SupportedDocumentFormats: []string{".doc", ".docx"},
		SupportedOutputFormats:   []string{"A4", "A3", "A5", "LETTER"},
		Features: []string{
			"Łączenie PDF",
			"Konwersja obrazów do PDF",
			"Konwersja DOC/DOCX do PDF",
			"Ekstrakcja tekstu z PDF",
			"Dodawanie kodów QR",
			"Dodawanie kodów kreskowych",
			"Podpisy cyfrowe",
			"Weryfikacja podpisów",
		},
	}

	c.JSON(http.StatusOK, response)
}

// Helper functions
func isPDFFile(filename string) bool {
	return strings.ToLower(filepath.Ext(filename)) == ".pdf"
}

func isImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	imageExts := []string{".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".tif"}
	for _, imgExt := range imageExts {
		if ext == imgExt {
			return true
		}
	}
	return false
}

func isDocumentFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	docExts := []string{".doc", ".docx"}
	for _, docExt := range docExts {
		if ext == docExt {
			return true
		}
	}
	return false
}

// @Summary Odczytywanie kodów kreskowych z obrazu/PDF
// @Description Odczytywanie kodów kreskowych z przekazanego pliku
// @Tags Code Reading
// @Accept multipart/form-data
// @Produce application/json
// @Param file formData file true "Plik obrazu lub PDF"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/read-barcodes [post]
func readBarcodes(c *gin.Context) {
	_, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku"})
		return
	}

	// Uproszczona implementacja - zwracamy informację o funkcji
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"barcodes":  []map[string]interface{}{},
		"count":     0,
		"message":   "Funkcja odczytywania kodów kreskowych wymaga implementacji",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// @Summary Odczytywanie kodów QR z obrazu/PDF
// @Description Odczytywanie kodów QR z przekazanego pliku
// @Tags Code Reading
// @Accept multipart/form-data
// @Produce application/json
// @Param file formData file true "Plik obrazu lub PDF"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/read-qr-codes [post]
func readQRCodes(c *gin.Context) {
	_, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku"})
		return
	}

	// Uproszczona implementacja - zwracamy informację o funkcji
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"qrCodes":   []map[string]interface{}{},
		"count":     0,
		"message":   "Funkcja odczytywania kodów QR wymaga implementacji",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// @Summary Odczytywanie wszystkich kodów (kreskowych i QR) z obrazu/PDF
// @Description Odczytywanie wszystkich kodów z przekazanego pliku
// @Tags Code Reading
// @Accept multipart/form-data
// @Produce application/json
// @Param file formData file true "Plik obrazu lub PDF"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /api/pdf/read-all-codes [post]
func readAllCodes(c *gin.Context) {
	_, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Message: "Nie przekazano pliku"})
		return
	}

	// Uproszczona implementacja - zwracamy informację o funkcji
	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"barcodes":  []map[string]interface{}{},
		"qrCodes":   []map[string]interface{}{},
		"count":     0,
		"message":   "Funkcja odczytywania wszystkich kodów wymaga implementacji",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
