export default {
  openapi: '3.0.0',
  info: {
    title: 'High-Performance PDF Service API',
    version: '2.0.0',
    description: 'Enterprise-grade PDF processing service with streaming capabilities and advanced performance optimizations',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    }
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Opis błędu'
          },
          code: {
            type: 'string',
            description: 'Kod błędu'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Czas wystąpienia błędu'
          }
        }
      },
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Status operacji'
          },
          message: {
            type: 'string',
            description: 'Komunikat sukcesu'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Czas wykonania operacji'
          }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Status serwisu',
            example: 'OK'
          },
          service: {
            type: 'string',
            description: 'Nazwa serwisu',
            example: 'NodeJS PDF Service'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Czas sprawdzenia'
          },
          version: {
            type: 'string',
            description: 'Wersja serwisu',
            example: '1.0.0'
          }
        }
      },
      BarcodeResult: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Typ kodu kreskowego'
          },
          data: {
            type: 'string',
            description: 'Odczytane dane'
          },
          format: {
            type: 'string',
            description: 'Format kodu'
          },
          confidence: {
            type: 'number',
            description: 'Poziom pewności odczytu (0-1)'
          }
        }
      },
      QRCodeResult: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Typ kodu QR'
          },
          data: {
            type: 'string',
            description: 'Odczytane dane'
          },
          format: {
            type: 'string',
            description: 'Format kodu'
          },
          confidence: {
            type: 'number',
            description: 'Poziom pewności odczytu (0-1)'
          }
        }
      },
      SignatureVerification: {
        type: 'object',
        properties: {
          verified: {
            type: 'boolean',
            description: 'Czy podpis jest prawidłowy'
          },
          message: {
            type: 'string',
            description: 'Komunikat weryfikacji'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Czas weryfikacji'
          }
        }
      },
      SupportedFormats: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description: 'Nazwa serwisu'
          },
          description: {
            type: 'string',
            description: 'Opis serwisu'
          },
          supportedImageFormats: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Obsługiwane formaty obrazów'
          },
          supportedPdfFormats: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Obsługiwane formaty PDF'
          },
          supportedDocumentFormats: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Obsługiwane formaty dokumentów'
          },
          supportedOutputFormats: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Obsługiwane formaty wyjściowe'
          },
          features: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista dostępnych funkcji'
          }
        }
      },
      TextExtraction: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Wyekstrahowany tekst'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Czas ekstrakcji'
          }
        }
      }
    },
    parameters: {
      outputFormat: {
        name: 'outputFormat',
        in: 'query',
        description: 'Format wyjściowy dokumentu',
        schema: {
          type: 'string',
          enum: ['A4', 'A3', 'A5', 'LETTER'],
          default: 'A4'
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Nieprawidłowe żądanie',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              message: 'Nie przekazano żadnych plików',
              code: 'VALIDATION_ERROR',
              timestamp: '2025-07-16T19:00:00.000Z'
            }
          }
        }
      },
      ServerError: {
        description: 'Błąd serwera',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              message: 'Wystąpił błąd podczas przetwarzania',
              code: 'INTERNAL_ERROR',
              timestamp: '2025-07-16T19:00:00.000Z'
            }
          }
        }
      },
      FileTooLarge: {
        description: 'Plik zbyt duży',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              message: 'Plik przekracza maksymalny rozmiar 10MB',
              code: 'FILE_TOO_LARGE',
              timestamp: '2025-07-16T19:00:00.000Z'
            }
          }
        }
      },
      UnsupportedMediaType: {
        description: 'Nieobsługiwany typ pliku',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              message: 'Plik musi być w obsługiwanym formacie',
              code: 'UNSUPPORTED_MEDIA_TYPE',
              timestamp: '2025-07-16T19:00:00.000Z'
            }
          }
        }
      },
      PDFResponse: {
        description: 'Plik PDF',
        content: {
          'application/pdf': {
            schema: {
              type: 'string',
              format: 'binary'
            }
          }
        }
      }
    },
    requestBodies: {
      SingleFile: {
        required: true,
        description: 'Pojedynczy plik',
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Plik do przetworzenia'
                }
              }
            }
          }
        }
      },
      MultipleFiles: {
        required: true,
        description: 'Wiele plików',
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['files'],
              properties: {
                files: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'binary'
                  },
                  description: 'Pliki do przetworzenia'
                }
              }
            }
          }
        }
      },
      FileWithText: {
        required: true,
        description: 'Plik z dodatkowym tekstem',
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'Plik do przetworzenia'
                },
                text: {
                  type: 'string',
                  description: 'Tekst do dodania'
                }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Sprawdza stan serwisu',
        description: 'Endpoint do monitorowania dostępności i stanu serwisu',
        tags: ['Health'],
        responses: {
          200: {
            description: 'Status serwisu',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatus'
                }
              }
            }
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/merge-pdfs': {
      post: {
        summary: 'Łączy kilka plików PDF w jeden dokument',
        description: 'Łączy wiele plików PDF w jeden dokument. Pliki są łączone w kolejności przekazania.',
        tags: ['PDF Operations'],
        parameters: [
          {
            $ref: '#/components/parameters/outputFormat'
          }
        ],
        requestBody: {
          $ref: '#/components/requestBodies/MultipleFiles'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/images-to-pdf': {
      post: {
        summary: 'Konwertuje obrazy do formatu PDF',
        description: 'Konwertuje obrazy (JPG, PNG, GIF, BMP, TIFF) do formatu PDF. Każdy obraz staje się osobną stroną.',
        tags: ['PDF Operations'],
        parameters: [
          {
            $ref: '#/components/parameters/outputFormat'
          }
        ],
        requestBody: {
          $ref: '#/components/requestBodies/MultipleFiles'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/merge-all': {
      post: {
        summary: 'Łączy pliki PDF i obrazy w jeden dokument',
        description: 'Łączy różne typy plików (PDF i obrazy) w jeden dokument PDF.',
        tags: ['PDF Operations'],
        parameters: [
          {
            $ref: '#/components/parameters/outputFormat'
          }
        ],
        requestBody: {
          $ref: '#/components/requestBodies/MultipleFiles'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/extract-text': {
      post: {
        summary: 'Ekstrahuje tekst z pliku PDF',
        description: 'Wyodrębnia tekst z dokumentu PDF i zwraca go w formacie zwykłego tekstu.',
        tags: ['PDF Operations'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            description: 'Wyekstrahowany tekst',
            content: {
              'text/plain': {
                schema: {
                  type: 'string'
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/doc-to-pdf': {
      post: {
        summary: 'Konwertuje pliki DOC/DOCX do PDF',
        description: 'Konwertuje dokumenty Microsoft Word (DOC, DOCX) do formatu PDF z zachowaniem formatowania.',
        tags: ['Document Conversion'],
        parameters: [
          {
            $ref: '#/components/parameters/outputFormat'
          }
        ],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/add-qr-code': {
      post: {
        summary: 'Dodaje kod QR do PDF',
        description: 'Dodaje kod QR do pierwszej strony dokumentu PDF.',
        tags: ['Barcodes & QR Codes'],
        requestBody: {
          $ref: '#/components/requestBodies/FileWithText'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/add-barcode': {
      post: {
        summary: 'Dodaje kod kreskowy do PDF',
        description: 'Dodaje kod kreskowy do pierwszej strony dokumentu PDF.',
        tags: ['Barcodes & QR Codes'],
        requestBody: {
          $ref: '#/components/requestBodies/FileWithText'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/sign': {
      post: {
        summary: 'Podpisuje PDF cyfrowo',
        description: 'Dodaje podpis cyfrowy do dokumentu PDF.',
        tags: ['Digital Signatures'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            $ref: '#/components/responses/PDFResponse'
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/verify-signature': {
      post: {
        summary: 'Weryfikuje podpis cyfrowy w PDF',
        description: 'Sprawdza poprawność podpisu cyfrowego w dokumencie PDF.',
        tags: ['Digital Signatures'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            description: 'Wynik weryfikacji podpisu',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SignatureVerification'
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          413: {
            $ref: '#/components/responses/FileTooLarge'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/read-barcodes': {
      post: {
        summary: 'Odczytywanie kodów kreskowych z obrazu/PDF',
        description: 'Odczytuje kody kreskowe z pliku obrazu lub PDF.',
        tags: ['Barcode Reading'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            description: 'Odczytane kody kreskowe',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    barcodes: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/BarcodeResult'
                      }
                    },
                    count: {
                      type: 'integer'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/read-qr-codes': {
      post: {
        summary: 'Odczytywanie kodów QR z obrazu/PDF',
        description: 'Odczytuje kody QR z pliku obrazu lub PDF.',
        tags: ['QR Code Reading'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            description: 'Odczytane kody QR',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    qrCodes: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/QRCodeResult'
                      }
                    },
                    count: {
                      type: 'integer'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/read-all-codes': {
      post: {
        summary: 'Odczytywanie wszystkich kodów (kreskowych i QR) z obrazu/PDF',
        description: 'Odczytuje wszystkie typy kodów z pliku obrazu lub PDF.',
        tags: ['Code Reading'],
        requestBody: {
          $ref: '#/components/requestBodies/SingleFile'
        },
        responses: {
          200: {
            description: 'Odczytane wszystkie kody',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: {
                      type: 'boolean'
                    },
                    codes: {
                      type: 'array',
                      items: {
                        oneOf: [
                          {
                            $ref: '#/components/schemas/BarcodeResult'
                          },
                          {
                            $ref: '#/components/schemas/QRCodeResult'
                          }
                        ]
                      }
                    },
                    barcodes: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/BarcodeResult'
                      }
                    },
                    qrCodes: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/QRCodeResult'
                      }
                    },
                    totalCount: {
                      type: 'integer'
                    },
                    timestamp: {
                      type: 'string',
                      format: 'date-time'
                    }
                  }
                }
              }
            }
          },
          400: {
            $ref: '#/components/responses/BadRequest'
          },
          415: {
            $ref: '#/components/responses/UnsupportedMediaType'
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    },
    '/api/pdf/supported-formats': {
      get: {
        summary: 'Zwraca informacje o obsługiwanych formatach',
        description: 'Zwraca szczegółowe informacje o wszystkich obsługiwanych formatach plików i funkcjach serwisu.',
        tags: ['Information'],
        responses: {
          200: {
            description: 'Informacje o obsługiwanych formatach',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SupportedFormats'
                }
              }
            }
          },
          500: {
            $ref: '#/components/responses/ServerError'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Health',
      description: 'Monitorowanie stanu serwisu'
    },
    {
      name: 'PDF Operations',
      description: 'Operacje na plikach PDF - łączenie, konwersja, ekstrakcja tekstu'
    },
    {
      name: 'Document Conversion',
      description: 'Konwersja dokumentów do formatu PDF'
    },
    {
      name: 'Barcodes & QR Codes',
      description: 'Dodawanie kodów kreskowych i QR do dokumentów PDF'
    },
    {
      name: 'Digital Signatures',
      description: 'Podpisy cyfrowe - tworzenie i weryfikacja'
    },
    {
      name: 'Barcode Reading',
      description: 'Odczytywanie kodów kreskowych z obrazów i PDF'
    },
    {
      name: 'QR Code Reading',
      description: 'Odczytywanie kodów QR z obrazów i PDF'
    },
    {
      name: 'Code Reading',
      description: 'Odczytywanie wszystkich typów kodów'
    },
    {
      name: 'Information',
      description: 'Informacje o serwisie i obsługiwanych formatach'
    }
  ]
}; 