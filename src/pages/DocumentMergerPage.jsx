import React, { useMemo, useState } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ArrowDown, ArrowUp, Download, FileArchive, FileText, Files, Trash2, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const A4 = { width: 595.28, height: 841.89 };
const PAGE_MARGIN = 48;
const TEXT_EXTENSIONS = ['txt', 'md', 'csv', 'json', 'log'];

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getExtension = (file) => (
  file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
);

const getFileKind = (file) => {
  const extension = getExtension(file);
  if (file.type === 'application/pdf' || extension === 'pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(extension)) return 'text';
  return 'attachment';
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const lines = [];
  const sourceLines = text.replace(/\t/g, '  ').split(/\r?\n/);

  sourceLines.forEach((sourceLine) => {
    const words = sourceLine.split(' ');
    let line = '';

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(nextLine, fontSize) <= maxWidth) {
        line = nextLine;
        return;
      }

      if (line) lines.push(line);

      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        line = word;
        return;
      }

      let chunk = '';
      [...word].forEach((character) => {
        const nextChunk = `${chunk}${character}`;
        if (font.widthOfTextAtSize(nextChunk, fontSize) <= maxWidth) {
          chunk = nextChunk;
        } else {
          lines.push(chunk);
          chunk = character;
        }
      });
      line = chunk;
    });

    lines.push(line);
  });

  return lines;
};

const addTextDocumentPages = async (pdfDoc, file, regularFont, boldFont) => {
  const text = await file.text();
  const titleSize = 14;
  const bodySize = 10;
  const lineHeight = 14;
  const maxWidth = A4.width - PAGE_MARGIN * 2;
  const lines = wrapText(text || '(empty file)', regularFont, bodySize, maxWidth);
  let page = pdfDoc.addPage([A4.width, A4.height]);
  let y = A4.height - PAGE_MARGIN;

  page.drawText(file.name, {
    x: PAGE_MARGIN,
    y,
    size: titleSize,
    font: boldFont,
    color: rgb(0.12, 0.12, 0.16),
    maxWidth,
  });
  y -= 28;

  lines.forEach((line) => {
    if (y < PAGE_MARGIN) {
      page = pdfDoc.addPage([A4.width, A4.height]);
      y = A4.height - PAGE_MARGIN;
    }

    page.drawText(line || ' ', {
      x: PAGE_MARGIN,
      y,
      size: bodySize,
      font: regularFont,
      color: rgb(0.18, 0.2, 0.25),
      maxWidth,
    });
    y -= lineHeight;
  });
};

const imageToJpeg = (file) => (
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);

      canvas.toBlob(async (blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error(`Could not prepare ${file.name}`));
          return;
        }

        resolve({
          bytes: await blob.arrayBuffer(),
          width: canvas.width,
          height: canvas.height,
        });
      }, 'image/jpeg', 0.92);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load ${file.name}`));
    };
    image.src = url;
  })
);

const addImagePage = async (pdfDoc, file) => {
  const image = await imageToJpeg(file);
  const embeddedImage = await pdfDoc.embedJpg(image.bytes);
  const page = pdfDoc.addPage([A4.width, A4.height]);
  const maxWidth = A4.width - PAGE_MARGIN * 2;
  const maxHeight = A4.height - PAGE_MARGIN * 2;
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  page.drawImage(embeddedImage, {
    x: (A4.width - drawWidth) / 2,
    y: (A4.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  });
};

const addAttachmentPage = async (pdfDoc, file, regularFont, boldFont) => {
  const bytes = await file.arrayBuffer();
  await pdfDoc.attach(bytes, file.name, {
    mimeType: file.type || 'application/octet-stream',
    description: `Original file attached by DocEdit: ${file.name}`,
    creationDate: new Date(file.lastModified || Date.now()),
    modificationDate: new Date(file.lastModified || Date.now()),
  });

  const page = pdfDoc.addPage([A4.width, A4.height]);
  page.drawText('Attached document', {
    x: PAGE_MARGIN,
    y: A4.height - PAGE_MARGIN - 20,
    size: 22,
    font: boldFont,
    color: rgb(0.14, 0.14, 0.18),
  });
  page.drawText(file.name, {
    x: PAGE_MARGIN,
    y: A4.height - PAGE_MARGIN - 56,
    size: 13,
    font: boldFont,
    color: rgb(0.91, 0.28, 0.6),
    maxWidth: A4.width - PAGE_MARGIN * 2,
  });
  page.drawText(`Type: ${file.type || getExtension(file).toUpperCase() || 'Unknown'}`, {
    x: PAGE_MARGIN,
    y: A4.height - PAGE_MARGIN - 90,
    size: 11,
    font: regularFont,
    color: rgb(0.28, 0.3, 0.36),
  });
  page.drawText(`Size: ${formatBytes(file.size)}`, {
    x: PAGE_MARGIN,
    y: A4.height - PAGE_MARGIN - 110,
    size: 11,
    font: regularFont,
    color: rgb(0.28, 0.3, 0.36),
  });
  page.drawText('This format cannot be rendered directly in the browser, so the original file is embedded as an attachment in the merged PDF.', {
    x: PAGE_MARGIN,
    y: A4.height - PAGE_MARGIN - 152,
    size: 10,
    font: regularFont,
    color: rgb(0.28, 0.3, 0.36),
    maxWidth: A4.width - PAGE_MARGIN * 2,
    lineHeight: 14,
  });
};

const mergeFiles = async (files) => {
  const output = await PDFDocument.create();
  const regularFont = await output.embedFont(StandardFonts.Helvetica);
  const boldFont = await output.embedFont(StandardFonts.HelveticaBold);

  for (const file of files) {
    const kind = getFileKind(file);

    if (kind === 'pdf') {
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
      continue;
    }

    if (kind === 'image') {
      await addImagePage(output, file);
      continue;
    }

    if (kind === 'text') {
      await addTextDocumentPages(output, file, regularFont, boldFont);
      continue;
    }

    await addAttachmentPage(output, file, regularFont, boldFont);
  }

  const bytes = await output.save();
  return new Blob([bytes], { type: 'application/pdf' });
};

const DocumentMergerPage = ({ theme, toggleTheme }) => {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSize = useMemo(() => (
    files.reduce((sum, file) => sum + file.size, 0)
  ), [files]);

  const fileCounts = useMemo(() => (
    files.reduce((counts, file) => {
      const kind = getFileKind(file);
      return { ...counts, [kind]: (counts[kind] || 0) + 1 };
    }, {})
  ), [files]);

  const handleFiles = (nextFiles) => {
    const selectedFiles = Array.from(nextFiles || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    setResult(null);
    setError('');
  };

  const moveFile = (index, direction) => {
    setFiles(prev => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setResult(null);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, fileIndex) => fileIndex !== index));
    setResult(null);
  };

  const handleMerge = async () => {
    if (!files.length) {
      setError('Choose at least one file first.');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setError('');

    try {
      setResult(await mergeFiles(files));
    } catch (err) {
      setError(err.message || 'Could not merge these files. Try a different PDF or document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged-documents.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading">
            <div>
              <p>Document Merger</p>
              <h1>Merge PDFs, images, and documents</h1>
            </div>
            <Files size={34} />
          </div>

          <div className="reducer-grid merger-grid">
            <div className="reducer-panel">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Choose files'}</strong>
                <span>PDF, images, text files, Word docs, sheets, slides, and other document files</span>
                <input
                  type="file"
                  accept=".pdf,image/*,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.rtf"
                  multiple
                  onChange={(event) => handleFiles(event.target.files)}
                />
              </label>

              <div className="reducer-stats merger-stats">
                <div>
                  <span>Files</span>
                  <strong>{files.length}</strong>
                </div>
                <div>
                  <span>PDFs</span>
                  <strong>{fileCounts.pdf || 0}</strong>
                </div>
                <div>
                  <span>Images</span>
                  <strong>{fileCounts.image || 0}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatBytes(totalSize)}</strong>
                </div>
              </div>

              <button className="btn-primary reducer-action" onClick={handleMerge} disabled={isProcessing || !files.length}>
                <FileArchive size={18} />
                <span>{isProcessing ? 'Merging...' : 'Merge Files'}</span>
              </button>

              {error && <p className="reducer-error">{error}</p>}
            </div>

            <div className="reducer-panel reducer-result merger-result">
              {files.length ? (
                <>
                  <div className="merger-list">
                    {files.map((file, index) => {
                      const kind = getFileKind(file);
                      return (
                        <div className="merger-file" key={`${file.name}-${file.lastModified}-${index}`}>
                          <div className="merger-file-icon">
                            {kind === 'image' ? <Files size={18} /> : <FileText size={18} />}
                          </div>
                          <div>
                            <strong>{file.name}</strong>
                            <span>{kind.toUpperCase()} · {formatBytes(file.size)}</span>
                          </div>
                          <div className="merger-file-actions">
                            <button type="button" className="icon-btn" title="Move up" onClick={() => moveFile(index, -1)} disabled={index === 0}>
                              <ArrowUp size={16} />
                            </button>
                            <button type="button" className="icon-btn" title="Move down" onClick={() => moveFile(index, 1)} disabled={index === files.length - 1}>
                              <ArrowDown size={16} />
                            </button>
                            <button type="button" className="icon-btn" title="Remove" onClick={() => removeFile(index)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button className="btn-primary reducer-action" onClick={handleDownload} disabled={!result}>
                    <Download size={18} />
                    <span>{result ? `Download ${formatBytes(result.size)}` : 'Download Merged PDF'}</span>
                  </button>
                </>
              ) : (
                <div className="reducer-empty">
                  <Files size={44} />
                  <p>Your merge order will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DocumentMergerPage;
