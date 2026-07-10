import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Layers, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PAGE_SIZES = {
  a4: { label: 'A4', width: 595.28, height: 841.89 },
  letter: { label: 'Letter', width: 612, height: 792 },
  image: { label: 'Image size', width: 0, height: 0 },
};

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const blobFromCanvas = (canvas, type, quality) => (
  new Promise((resolve) => canvas.toBlob(resolve, type, quality))
);

const loadImage = (file) => (
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    image.src = url;
  })
);

const bytesFromBlob = async (blob) => new Uint8Array(await blob.arrayBuffer());

const encodeAscii = (value) => new TextEncoder().encode(value);

const getPageBox = (image, pageSize, orientation) => {
  if (pageSize === 'image') {
    return {
      width: Math.max(1, image.width),
      height: Math.max(1, image.height),
    };
  }

  const base = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  const shouldLandscape = orientation === 'landscape';
  return {
    width: shouldLandscape ? base.height : base.width,
    height: shouldLandscape ? base.width : base.height,
  };
};

const imageToJpegBytes = async (file, quality) => {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);

  const blob = await blobFromCanvas(canvas, 'image/jpeg', quality / 100);
  if (!blob) throw new Error('Could not prepare image');

  return {
    bytes: await bytesFromBlob(blob),
    width: canvas.width,
    height: canvas.height,
  };
};

const createPdf = (pages, settings) => {
  const objects = [];

  const reserveObject = () => {
    objects.push(null);
    return objects.length;
  };

  const setObject = (id, parts) => {
    objects[id - 1] = parts;
  };

  const catalogId = reserveObject();
  const pagesId = reserveObject();
  const pageIds = [];

  pages.forEach((page) => {
    const pageId = reserveObject();
    const imageId = reserveObject();
    const contentId = reserveObject();
    pageIds.push(pageId);

    const pageBox = getPageBox(page, settings.pageSize, settings.orientation);
    const margin = settings.margin;
    const availableWidth = Math.max(1, pageBox.width - margin * 2);
    const availableHeight = Math.max(1, pageBox.height - margin * 2);
    const imageRatio = page.width / page.height;
    const boxRatio = availableWidth / availableHeight;
    const drawWidth = imageRatio > boxRatio ? availableWidth : availableHeight * imageRatio;
    const drawHeight = imageRatio > boxRatio ? availableWidth / imageRatio : availableHeight;
    const x = (pageBox.width - drawWidth) / 2;
    const y = (pageBox.height - drawHeight) / 2;
    const imageName = `Im${pageIds.length - 1}`;
    const content = `q\n${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/${imageName} Do\nQ\n`;

    setObject(pageId, [
      encodeAscii(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageBox.width.toFixed(2)} ${pageBox.height.toFixed(2)}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`),
    ]);
    setObject(imageId, [
      encodeAscii(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      encodeAscii('\nendstream'),
    ]);
    setObject(contentId, [
      encodeAscii(`<< /Length ${encodeAscii(content).length} >>\nstream\n${content}endstream`),
    ]);
  });

  setObject(catalogId, [encodeAscii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)]);
  setObject(pagesId, [
    encodeAscii(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`),
  ]);

  const parts = [encodeAscii('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')];
  const offsets = [0];
  let length = parts[0].length;

  objects.forEach((objectParts, index) => {
    offsets.push(length);
    const prefix = encodeAscii(`${index + 1} 0 obj\n`);
    const suffix = encodeAscii('\nendobj\n');
    parts.push(prefix, ...objectParts, suffix);
    length += prefix.length + objectParts.reduce((sum, part) => sum + part.length, 0) + suffix.length;
  });

  const xrefOffset = length;
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n');
  parts.push(encodeAscii(xref));

  return new Blob(parts, { type: 'application/pdf' });
};

const ImageToPdfPage = ({ theme, toggleTheme }) => {
  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [margin, setMargin] = useState(28);
  const [quality, setQuality] = useState(92);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const totalInputSize = useMemo(() => (
    files.reduce((sum, file) => sum + file.size, 0)
  ), [files]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const handleFileChange = (nextFiles) => {
    setFiles(Array.from(nextFiles || []));
    setResult(null);
    setError('');
  };

  const handleConvert = async () => {
    if (!files.length) {
      setError('Please choose at least one image first.');
      return;
    }

    setError('');
    setResult(null);
    setIsProcessing(true);

    try {
      const pages = [];
      for (const file of files) {
        pages.push(await imageToJpegBytes(file, quality));
      }

      const blob = createPdf(pages, {
        pageSize,
        orientation,
        margin: Number(margin),
      });
      setResult(blob);
    } catch (err) {
      setError(err.message || 'PDF conversion failed. Try another image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const url = URL.createObjectURL(result);
    const link = document.createElement('a');
    const baseName = files.length > 1 ? 'images' : files[0]?.name?.replace(/\.[^.]+$/, '') || 'image';
    link.href = url;
    link.download = `${baseName}-created.pdf`;
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
              <p>Create PDF from Images</p>
              <h1>Create a PDF from one or more images</h1>
            </div>
            <FileText size={34} />
          </div>

          <div className="reducer-grid pdf-grid">
            <div className="reducer-panel">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{files.length ? `${files.length} image${files.length > 1 ? 's' : ''} selected` : 'Choose images'}</strong>
                <span>{files.length ? formatBytes(totalInputSize) : 'JPG, PNG, WebP and other browser-supported images'}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileChange(event.target.files)}
                />
              </label>

              <div className="reducer-controls pdf-controls">
                <label>
                  <span>Page size</span>
                  <select value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                    {Object.entries(PAGE_SIZES).map(([value, page]) => (
                      <option key={value} value={value}>{page.label}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Orientation</span>
                  <select
                    value={orientation}
                    onChange={(event) => setOrientation(event.target.value)}
                    disabled={pageSize === 'image'}
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>
              </div>

              <label className="quality-control">
                <div>
                  <span>Page margin</span>
                  <strong>{margin} pt</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="72"
                  value={margin}
                  onChange={(event) => {
                    setMargin(event.target.value);
                    setResult(null);
                  }}
                />
              </label>

              <label className="quality-control">
                <div>
                  <span>Image quality</span>
                  <strong>{quality}%</strong>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  value={quality}
                  onChange={(event) => {
                    setQuality(event.target.value);
                    setResult(null);
                  }}
                />
              </label>

              <button className="btn-primary reducer-action" onClick={handleConvert} disabled={isProcessing}>
                <FileText size={18} />
                <span>{isProcessing ? 'Converting...' : 'Create PDF'}</span>
              </button>

              {error && <p className="reducer-error">{error}</p>}
            </div>

            <div className="reducer-panel reducer-result pdf-result">
              {files.length ? (
                <>
                  <div className="pdf-preview-grid">
                    {previewUrls.map((url, index) => (
                      <div key={`${files[index]?.name}-${index}`} className="pdf-preview-item">
                        <img src={url} alt={`PDF page ${index + 1}`} />
                        <span>Page {index + 1}</span>
                      </div>
                    ))}
                  </div>

                  <div className="reducer-stats pdf-stats">
                    <div>
                      <span>Images</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div>
                      <span>Input</span>
                      <strong>{formatBytes(totalInputSize)}</strong>
                    </div>
                    <div>
                      <span>PDF</span>
                      <strong>{result ? formatBytes(result.size) : 'Ready'}</strong>
                    </div>
                  </div>

                  <button className="btn-primary reducer-action" onClick={handleDownload} disabled={!result}>
                    <Download size={18} />
                    <span>Download PDF</span>
                  </button>
                </>
              ) : (
                <div className="reducer-empty">
                  <Layers size={44} />
                  <p>Your PDF pages will appear here.</p>
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

export default ImageToPdfPage;



