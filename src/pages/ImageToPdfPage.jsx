import React, { useEffect, useMemo, useState } from 'react';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import X from 'lucide-react/dist/esm/icons/x';
import { Download, FileText, Image as ImageIcon, Layers, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';

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
    <div className="app-container reducer-page pdf-tool-page pdf-merge-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header */}
          <div className="reducer-heading">
            <div>
              <p>Image Tools</p>
              <h1>Create PDF from Images</h1>
            </div>
            <FileText size={34} className="desktop-only" />
          </div>

          {!files.length ? (
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Convert your images to a professional PDF document. Fast, secure, and stays 100% private in your browser.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Upload size={32} />
                </div>
                <strong>Select images to convert</strong>
                <span>Drag & drop images here, or click to browse</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => handleFileChange(event.target.files)}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <ImageIcon size={16} />
                  <span>JPG, PNG, WebP Support</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Layers size={16} />
                  <span>Multi-Page Layouts</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Sparkles size={16} />
                  <span>High Quality Output</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pdf-merge-layout">
              {/* Left Column: Controls Sidebar */}
              <aside className="pdf-merge-sidebar">
                {/* Image Summary Card */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">PDF Summary</h3>
                  <div className="pdf-split-stats-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="pdf-split-stat-row">
                      <span>Images:</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div className="pdf-split-stat-row">
                      <span>Total Input:</span>
                      <strong>{formatBytes(totalInputSize)}</strong>
                    </div>
                    <div className="pdf-split-stat-row highlight">
                      <span>PDF Size:</span>
                      <strong>{result ? formatBytes(result.size) : 'Pending'}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pdf-remove-change-btn"
                    onClick={() => document.querySelector('.add-more-images-input').click()}
                  >
                    <Upload size={14} />
                    <span>Add More Images</span>
                  </button>
                  <input
                    type="file"
                    className="add-more-images-input"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      setFiles(prev => [...prev, ...newFiles]);
                      setResult(null);
                    }}
                  />
                </div>

                {/* Page Settings Card */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Page Settings</h3>

                  <div className="pdf-split-field">
                    <label>Page Size:</label>
                    <select className="pdf-merge-name-input" value={pageSize} onChange={(event) => setPageSize(event.target.value)}>
                      {Object.entries(PAGE_SIZES).map(([value, page]) => (
                        <option key={value} value={value}>{page.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pdf-split-field">
                    <label>Orientation:</label>
                    <div className="pdf-split-toggle-group">
                      <button
                        type="button"
                        className={orientation === 'portrait' ? 'active' : ''}
                        onClick={() => setOrientation('portrait')}
                        disabled={pageSize === 'image'}
                      >
                        <span>Portrait</span>
                      </button>
                      <button
                        type="button"
                        className={orientation === 'landscape' ? 'active' : ''}
                        onClick={() => setOrientation('landscape')}
                        disabled={pageSize === 'image'}
                      >
                        <span>Landscape</span>
                      </button>
                    </div>
                  </div>

                  <div className="pdf-split-field">
                    <div className="pdf-split-slider-header">
                      <label>Page Margin:</label>
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
                      className="pdf-split-range"
                    />
                  </div>

                  <div className="pdf-split-field">
                    <div className="pdf-split-slider-header">
                      <label>Image Quality:</label>
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
                      className="pdf-split-range"
                    />
                  </div>
                </div>

                {/* Primary Action Zone */}
                <div className="pdf-merge-action-zone">
                  {error && (
                    <div className="reducer-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary pdf-remove-download-btn"
                    onClick={handleConvert}
                    disabled={isProcessing || files.length === 0}
                    style={{ background: 'var(--primary)', borderColor: 'var(--primary-hover)', color: 'white', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)' }}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="spin" />
                        <span>Converting...</span>
                      </>
                    ) : (
                      <>
                        <FileText size={18} />
                        <span>Create PDF</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Success Card */}
                {result && (
                  <div className="pdf-merge-success-card">
                    <div className="pdf-merge-success-header">
                      <CheckCircle2 size={20} color="#10b981" />
                      <div>
                        <strong>PDF Created!</strong>
                        <span>{files.length} pages · {formatBytes(result.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pdf-merge-download-btn"
                      onClick={handleDownload}
                    >
                      <Download size={18} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                )}
              </aside>

              {/* Right Column: Preview Grid */}
              <section className="pdf-remove-gallery-panel">
                <div className="pdf-merge-cards-header">
                  <strong>Image Pages ({files.length})</strong>
                  <span className="pdf-split-hint-text desktop-only">
                    ✓ Your PDF will follow this page sequence
                  </span>
                </div>

                <div className="pdf-merge-grid" style={{ marginTop: '1rem' }}>
                  {previewUrls.map((url, index) => (
                    <div key={`${files[index]?.name}-${index}`} className="pdf-merge-card" style={{ cursor: 'default' }}>
                      <div className="pdf-merge-card-badge">
                        #{index + 1}
                      </div>
                      <div className="pdf-merge-thumb-wrap">
                        <img src={url} alt={`Page ${index + 1}`} />
                      </div>
                      <div className="pdf-merge-card-details">
                        <strong className="pdf-merge-card-title" title={files[index]?.name}>
                          {files[index]?.name}
                        </strong>
                        <div className="pdf-merge-card-meta">
                          <span className="pdf-merge-meta-size">
                            {formatBytes(files[index]?.size)}
                          </span>
                        </div>
                      </div>
                      <div className="pdf-merge-card-actions">
                        <button
                          type="button"
                          className="pdf-merge-delete-btn"
                          onClick={() => {
                            setFiles(prev => prev.filter((_, i) => i !== index));
                            setResult(null);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ImageToPdfPage;



