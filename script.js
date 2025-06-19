document.addEventListener('DOMContentLoaded', function() {
    // ===================================================================
    // BAGIAN 1: KONTROL PERALIHAN DARI LANDING PAGE KE APLIKASI
    // ===================================================================
    const enterAppFaskesBtn = document.getElementById('enter-app-faskes-btn');
    const enterAppFasumBtn = document.getElementById('enter-app-fasum-btn');
    const landingPage = document.getElementById('landing-page');
    const appContainerFaskes = document.getElementById('app-container-faskes');
    const appContainerFasum = document.getElementById('app-container-fasum');
    
    let mapFaskes; 
    let mapFasum;

    function showApp(appType) {
        landingPage.style.display = 'none';
        if (appType === 'faskes') {
            appContainerFaskes.style.display = 'flex';
            appContainerFasum.style.display = 'none';
            if (!mapFaskes) {
                initializeMapAndFeatures('faskes');
            }
            setTimeout(() => { if (mapFaskes) mapFaskes.invalidateSize(); }, 10);
        } else if (appType === 'fasum') {
            appContainerFasum.style.display = 'flex';
            appContainerFaskes.style.display = 'none';
            if (!mapFasum) {
                initializeMapAndFeatures('fasum');
            }
            setTimeout(() => { if (mapFasum) mapFasum.invalidateSize(); }, 10);
        }
    }

    if (enterAppFaskesBtn) {
        enterAppFaskesBtn.addEventListener('click', function(event) {
            event.preventDefault(); 
            showApp('faskes');
        });
    }

    if (enterAppFasumBtn) {
        enterAppFasumBtn.addEventListener('click', function(event) {
            event.preventDefault(); 
            showApp('fasum');
        });
    }

    // ===================================================================
    // BAGIAN 2: KODE INTI APLIKASI WEBGIS (MODULAR UNTUK KEDUA PETA)
    // ===================================================================

    const GOOGLE_SHEET_API_URL_FASKES = 'https://script.google.com/macros/s/AKfycbyQVKYYomXe4MHHBw36G5Q_ZbcRhZTxCY-x8DiJJf7jnfq054pQtKHvlLed099etduT/exec'; 
    const GOOGLE_SHEET_API_URL_FASUM = 'https://script.google.com/macros/s/AKfycbzZk3iAv-KI_Jzm0f4ia8L5IJ2SQplQ5fChGymyHxYwMNBF3pic9R7Elqy_3UNiBwPR/exec';

    function getCategoryStyle(properties, type) {
        let kategori = 'Lainnya';
        if (type === 'faskes') {
            kategori = properties.Kategori ? String(properties.Kategori).toLowerCase() : 'lainnya';
            const styles = {
                'puskesmas': { color: '#4c4c4c' },
                'rumah sakit umum': { color: '#ADADC9' },
                'rumah sakit ibu dan anak': { color: '#e83e8c' },
                'rumah sakit khusus': { color: '#DAD4D9' },
                'lainnya': { color: '#6c757d' }
            };
            for (const key in styles) { if (kategori.includes(key)) { return styles[key]; } }
            return styles['lainnya'];
        } else if (type === 'fasum') {
            kategori = properties.Kategori ? String(properties.Kategori).toLowerCase() : 'lainnya';
            if (kategori === 'lainnya' && properties.Jenis_Fasi) {
                kategori = String(properties.Jenis_Fasi).toLowerCase();
            }
            const styles = {
                'wisata': { color: '#1a535c' },
                'publik': { color: '#4d4f79' },
                'transportasi': { color: '#88a825' },
                'perdagangan': { color: '#d9534f' },
                'pemerintahan': { color: '#5cb85c' },
                'edukasi': { color: '#663399' },
                'ibadah': { color: '#a031a0' },
                'budaya': { color: '#ff7f00' },
                'olahraga': { color: '#f0ad4e' },
                'lainnya': { color: '#6c757d' }
            };
            for (const key in styles) { if (kategori.includes(key)) { return styles[key]; } }
            return styles['lainnya'];
        }
        return { color: '#6c757d' };
    }

    function getMarkerIcon(properties, size, type) {
        const style = getCategoryStyle(properties, type);
        const color = style.color;
        const svgTemplate = (bgColor, innerIcon, width, height) => `<svg viewBox="0 0 32 46" xmlns="http://www.w3.org/2000/svg" style="width:${width}px; height:${height}px;"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.13.424 4.16.208 6.142.063 2.053 4.205 13.064 14.286 23.634a1.815 1.815 0 002.946-.002C27.502 35.196 31.64 24.187 31.71 22.14C31.576 20.16 32 18.13 32 16 32 7.163 24.837 0 16 0z" fill="${bgColor}"/><g transform="translate(8 8) scale(1)">${innerIcon}</g></svg>`;
        const iconPaths = {
            'default': '<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" fill="white"/>',
            'rumah sakit': '<path d="M6 0a1 1 0 0 0-1 1v1a1 1 0 0 0-1 1v4H1a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h6v-2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V16h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3V3a1 1 0 0 0-1-1V1a1 1 0 0 0-1-1zm2.5 5.034v1.1l.953-.55.5.867L9 7l.953.55-.5.866-.953-.55v1.1h-1v-1.1l-.953.55-.5-.866L7 7l-.953-.55.5-.866.953.55v-1.1zM2.25 9h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5A.25.25 0 0 1 2 9.75v-.5A.25.25 0 0 1 2.25 9m0 2h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5a.25.25 0 0 1 .25-.25M2 13.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zM13.25 9h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5a.25.25 0 0 1 .25-.25M13 11.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zm.25 1.75h.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-.5a.25.25 0 0 1 .25-.25"/>',
            'puskesmas': '<path d="M10.5 5.5a.5.5 0 0 0-1 0v.634l-.549-.317a.5.5 0 1 0-.5.866L9.5 7.234V8.5a.5.5 0 0 0 1 0v-1.266l.549.317a.5.5 0 1 0 .5-.866L10.5 6.134V5.5ZM6.5 5.5a.5.5 0 0 0-1 0v.634l-.549-.317a.5.5 0 1 0-.5.866L5.5 7.234V8.5a.5.5 0 0 0 1 0v-1.266l.549.317a.5.5 0 1 0 .5-.866L6.5 6.134V5.5Z" fill="white"/><path d="M13.293 1.207a.5.5 0 0 0-.01.011L11 3.557V2.5a.5.5 0 0 0-1 0v1.558l-1.56-1.04a.5.5 0 1 0-.58.864L8.5 4.366V5.5a.5.5 0 0 0 1 0V4.366l.56.373a.5.5 0 1 0 .58-.864L9 2.842V1.5a.5.5 0 0 0-1 0v.5l-2 1.333V2.5a.5.5 0 0 0-1 0v1.586l-1.293-1.293a.5.5 0 0 0-.707.707L4.586 5H3.5a.5.5 0 0 0 0 1h.59l-1.84 1.84a.5.5 0 1 0 .707.707L4.5 7.586V9H3.5a.5.5 0 0 0 0 1h1v1.5a.5.5 0 0 0 1 0V10h.586l1.207 1.207a.5.5 0 0 0 .707-.707L6.293 9.293l.293-.293H8.5a.5.5 0 0 0 0-1H7.086l.293-.293a.5.5 0 0 0 0-.707L6.293 6.293l1.5-1V5.5a.5.5 0 0 0 1 0V4.814l.659-.44a.5.5 0 0 0 0-.888l-1.07-.714.714-.714a.5.5 0 1 0-.707-.707L7.05 2.5H6.5a.5.5 0 0 0 0 1h.5l-2.021 1.347A1.5 1.5 0 0 0 4 6.5v3a1.5 1.5 0 0 0 .756 1.325L2.84 12.74a.5.5 0 1 0 .82.52L5.5 11.5v-1a.5.5 0 0 0-1 0v.707l-1.085-1.085a.5.5 0 0 0-.707 0 1.5 1.5 0 0 0 0 2.121.5.5 0 0 0 .707 0L5.5 11.121V12.5a.5.5 0 0 0 1 0v-.5h1v.5a.5.5 0 0 0 1 0v-1a.5.5 0 0 0-1 0V12h-1V9.5a.5.5 0 0 0-1 0V11H5.5a.5.5 0 0 0-.354.146L4.06 12.233A.5.5 0 0 1 3.5 12.5v-1a.5.5 0 0 0-1 0v.5a1.5 1.5 0 0 0 .22 1.175.5.5 0 0 0 .587.18L5.5 12.512V13.5a.5.5 0 0 0 1 0v-1h.5a.5.5 0 0 0 .354-.146L8.94 10.767A.5.5 0 0 1 9.5 10.5v1a.5.5 0 0 0 1 0V9.707l1.293 1.293a.5.5 0 0 0 .707-.707L10.414 10.5H11.5a.5.5 0 0 0 0-1h-.5l2.021-1.347A1.5 1.5 0 0 0 14 6.5v-3a1.5 1.5 0 0 0-.707-1.293Z" fill="white"/>',
            'edukasi': '<path d="M8.5 2.687c.654-.488 1.53-.888 2.528-.888 2.21 0 4 1.226 4 3.202 0 1.957-1.525 3.111-3.43 3.111-1.147 0-2.024-.523-2.612-1.037a.5.5 0 0 0-.577.795c.634.593 1.625 1.12 2.81 1.12 2.536 0 4.546-1.573 4.546-4.144 0-2.2-1.9-3.72-4.224-3.72-1.022 0-1.912.39-2.612.852a.5.5 0 0 0 .577.795z" fill="white"/><path d="M12.25 9.455c.634.593 1.625 1.12 2.81 1.12 2.536 0 4.546-1.573 4.546-4.144 0-2.2-1.9-3.72-4.224-3.72-1.022 0-1.912.39-2.612.852a.5.5 0 0 0 .577.795c.654-.488 1.53-.888 2.528-.888 2.21 0 4 1.226 4 3.202 0 1.957-1.525 3.111-3.43 3.111-1.147 0-2.024-.523-2.612-1.037a.5.5 0 0 0-.577.795zM8.5.034a.5.5 0 0 0-.5.5v15a.5.5 0 0 0 1 0v-15a.5.5 0 0 0-.5-.5z" fill="white"/>',
            'pemerintahan': '<path d="M8.5 3.236a.5.5 0 0 0-1 0v7.528l-2.439-1.22a.5.5 0 0 0-.522.894l3.5 1.75a.5.5 0 0 0 .522 0l3.5-1.75a.5.5 0 0 0-.522-.894L8.5 10.764V3.236z" fill="white"/><path d="M2.5 7.422a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1.293l.24-.12a.5.5 0 0 1 .52.894l-2.5 1.25a.5.5 0 0 1-.52 0l-2.5-1.25a.5.5 0 0 1 .52-.894l.24.12V7.422zm10 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1.293l.24-.12a.5.5 0 0 1 .52.894l-2.5 1.25a.5.5 0 0 1-.52 0l-2.5-1.25a.5.5 0 0 1 .52-.894l.24.12V7.422z" fill="white"/><path d="M8 0a2.5 2.5 0 0 0-2.5 2.5v.558l-2.5 1.25a.5.5 0 0 0-.022.01l-2.5 1.25a.5.5 0 0 0 .022.98l2.5 1.25a.5.5 0 0 0 .478-.01L6 7.558v.5a2.5 2.5 0 1 0 4 0v-.5l2.5-1.25a.5.5 0 0 0 .478-.01l2.5-1.25a.5.5 0 0 0 .022-.98L10 4.308v-.5A2.5 2.5 0 0 0 8 0zm0 1a1.5 1.5 0 0 1 1.5 1.5v.558l-1.5.75-1.5-.75V2.5A1.5 1.5 0 0 1 8 1z" fill="white"/>',
            'perdagangan': '<path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1zm3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4h-3.5zM2 5h12v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" fill="white"/>',
            'wisata': '<path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="white"/><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0z" fill="white"/>',
            'transportasi': '<path d="M8.5 4.5a.5.5 0 0 0-1 0v1h-2a.5.5 0 0 0 0 1h2v1a.5.5 0 0 0 1 0v-1h2a.5.5 0 0 0 0-1h-2v-1z" fill="white"/><path d="M8 16a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.5-14a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5zm-3.354.646a.5.5 0 1 1 .708.708L6.707 4.207a.5.5 0 0 1-.707.707L4.146 3.053a.5.5 0 0 1 0-.707.5.5 0 0 1 .708 0zM4.5 8.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm3.854 4.354a.5.5 0 1 1-.708-.708L10.293 11.293a.5.5 0 0 1 .707.707L8.354 14.854a.5.5 0 0 1-.708 0z" fill="white"/>',
            'ibadah': '<path d="M8 15.5a.5.5 0 0 0 .5-.5V8.5a.5.5 0 0 0-1 0V15a.5.5 0 0 0 .5.5z" fill="white"/><path d="M8 1.5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5z" fill="white"/><path d="M8 0a2.5 2.5 0 0 0-2.5 2.5V3h5V2.5A2.5 2.5 0 0 0 8 0zM12.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1h-3A1.5 1.5 0 0 0 5 2.5V3H3.5a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5zM4 4h8v11H4V4z" fill="white"/>'
        };
        let innerIcon = iconPaths['default'];
        let kategoriString = '';
        if (type === 'faskes') {
            kategoriString = properties.Kategori ? String(properties.Kategori).toLowerCase() : 'lainnya';
        } else if (type === 'fasum') {
            kategoriString = properties.Kategori ? String(properties.Kategori).toLowerCase() : (properties.Jenis_Fasi ? String(properties.Jenis_Fasi).toLowerCase() : 'lainnya');
        }
        for (const key in iconPaths) { if (kategoriString.includes(key)) { innerIcon = iconPaths[key]; break; } }
        const iconHtml = svgTemplate(color, innerIcon, size.width, size.height);
        return L.divIcon({ html: iconHtml, className: 'faskes-marker-container', iconSize: [size.width, size.height], iconAnchor: [size.width / 2, size.height], popupAnchor: [0, -size.height] });
    }

    function createPopupContent(properties, type) {
        const imageUrl = `assets/${properties.gambar || 'default.jpg'}`;
        const lat = properties.Latitude || properties.Y;
        const lng = properties.Longitude || properties.X;
        const safeName = properties.Nama_Fasil || properties.Nama ? (properties.Nama_Fasil || properties.Nama).replace(/'/g, "\\'") : ''; 
        const displayAddress = properties.Lokasi || properties.Alamat || 'Alamat tidak tersedia';
        const actionButtons = `<button class="popup-button" onclick="window.requestRouteFromUser_${type}(${lat}, ${lng})">Rute dari Lokasi Saya</button> <button class="popup-button secondary" onclick="window.searchRadiusFromFaskes_${type}(${lat}, ${lng}, '${safeName}')">Cari Terdekat</button>`;
        const setStartRouteButton = `<button class="popup-button" onclick="window.setRoutingStart_${type}(${lat}, ${lng}, '${safeName}')">Jadikan Titik Awal Rute</button>`;
        const reportButton = `<button class="popup-button report-faskes-btn" data-faskes-name="${safeName}" data-faskes-id="${properties.No || properties.FaskesID || ''}" data-type="${type}">Laporkan / Ulas Ini</button>`;
        let detailsHTML = '';
        if (type === 'faskes') {
            const commonDetails = { 'Layanan': { icon: `<span class="icon" style="font-size:1.8em">⚕️</span>`, value: properties.Layanan }, 'Telepon': { icon: `<span class="icon" style="font-size:1.8em">📞</span>`, value: properties.Telepon }, 'Kabupaten': { icon: `<span class="icon" style="font-size:1.8em">🏙️</span>`, value: properties.Kabupaten } };
            const specificDetails = {};
            if (properties.Kategori !== 'puskesmas') {
                Object.assign(specificDetails, { 'Kelas': { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`, value: properties.Kelas }, 'Kapasitas': { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 12h-2v4h-4v-4H8l4-4 4 4zm-4-10C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`, value: properties.Kapasitas ? `${properties.Kapasitas} bed` : null }, 'Jam Operasi': { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`, value: properties.Jam_Operasi }, 'Kepemilikan': { icon: `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/></svg>`, value: properties.Kepemilikan || 'Tidak Diketahui' } });
            }
            const allDetails = { ...commonDetails, ...specificDetails };
            for (const prop in allDetails) { if (allDetails[prop].value) { detailsHTML += `<div class="detail-item" title="${prop}">${allDetails[prop].icon}<span>${allDetails[prop].value}</span></div>`; } }
        } else if (type === 'fasum') {
            const commonDetails = { 'Nama Fasilitas': { icon: `<span class="icon" style="font-size:1.8em">📍</span>`, value: properties.Nama_Fasil }, 'Kategori': { icon: `<span class="icon" style="font-size:1.8em">🏷️</span>`, value: properties.Kategori }, 'Pengelola': { icon: `<span class="icon" style="font-size:1.8em">🏢</span>`, value: properties.Pengelola || 'Tidak Diketahui' }, 'Jam Operasi': { icon: `<span class="icon" style="font-size:1.8em">⏰</span>`, value: properties.Jam_Operas || 'Tidak Tersedia' }, 'Harga Tiket': { icon: `<span class="icon" style="font-size:1.8em">💸</span>`, value: properties.Harga_Tike || 'Gratis' }, 'Keterangan': { icon: `<span class="icon" style="font-size:1.8em">💬</span>`, value: properties.Keterangan || 'Tidak Tersedia' } };
            for (const prop in commonDetails) { if (commonDetails[prop].value) { detailsHTML += `<div class="detail-item" title="${prop}">${commonDetails[prop].icon}<span>${commonDetails[prop].value}</span></div>`; } }
        }
        return `<div class="custom-popup-card"><img src="${imageUrl}" alt="Foto ${properties.Nama_Fasil || properties.Nama}" onerror="this.onerror=null;this.src='assets/default.jpg';"><div class="card-content"><h3 class="card-title">${properties.Nama_Fasil || properties.Nama || 'Nama Fasilitas'}</h3><p class="card-address">${displayAddress}</p><div class="card-details" style="grid-template-columns: repeat(3, 1fr);">${detailsHTML}</div></div><div class="card-actions" style="flex-direction: column; gap: 5px;">${setStartRouteButton} ${actionButtons} ${reportButton}</div></div>`;
    }

    function initializeMapAndFeatures(type) {
        let currentMap, allData, layerGroup, routingControl, userLocationMarker,
            categoryChart, markerLayers, routingOrigin, radiusCircle,
            radiusCenterMarker, isRadiusSelectionMode, isCustomRoutingMode,
            customRouteWaypoints, temporaryMarkersLayer, geocodeMarker,
            activeGeoJsonLayer, batasWilayahGeoJson, heatmapLayer, heatmapLegend,
            clearRouteBtn, clearBufferBtn; 

        const mapId = `map-${type}`;
        const mainContainer = document.getElementById(`main-container-${type}`);
        const toolbarId = `map-toolbar-${type}`;
        const panelContainerId = `panel-container-${type}`;
        const mapContainer = document.getElementById(`map-container-${type}`);
        
        let existingRouteBtn = document.getElementById(`clear-route-btn-${type}`);
        if (existingRouteBtn) existingRouteBtn.remove();
        clearRouteBtn = document.createElement('button');
        clearRouteBtn.id = `clear-route-btn-${type}`;
        clearRouteBtn.className = 'clear-route-btn';
        clearRouteBtn.innerHTML = '<i class="fas fa-times"></i>';
        clearRouteBtn.title = 'Hapus Rute';
        mapContainer.appendChild(clearRouteBtn);

        let existingBufferBtn = document.getElementById(`clear-buffer-btn-${type}`);
        if (existingBufferBtn) existingBufferBtn.remove();
        clearBufferBtn = document.createElement('button');
        clearBufferBtn.id = `clear-buffer-btn-${type}`;
        clearBufferBtn.className = 'clear-buffer-btn';
        clearBufferBtn.innerHTML = '<i class="fas fa-eraser"></i>';
        clearBufferBtn.title = 'Hapus Buffer Radius';
        mapContainer.appendChild(clearBufferBtn);

        const searchInput = document.getElementById(`search-input-${type}`);
        const searchResults = document.getElementById(`search-results-${type}`);
        const statusPanel = document.getElementById(`status-panel-${type}`);
        const radiusSlider = document.getElementById(`radius-slider-${type}`);
        const radiusValue = document.getElementById(`radius-value-${type}`);
        const findByMyLocationBtn = document.getElementById(`find-by-mylocation-btn-${type}`);
        const findByMapClickBtn = document.getElementById(`find-by-map-click-btn-${type}`);
        const customRouteBtn = document.getElementById(`custom-route-btn-${type}`);
        const categoryFilterDropdown = document.getElementById(`kategori-filter-${type}`);
        const addressSearchInput = document.getElementById(`address-search-input-${type}`);
        const geocodeAddressBtn = document.getElementById(`geocode-address-btn-${type}`);
        const geocodeResultsDiv = document.getElementById(`geocode-results-${type}`);
        const areaColorPicker = document.getElementById(`area-color-picker-${type}`);
        const areaOpacitySlider = document.getElementById(`area-opacity-slider-${type}`);
        const areaOpacityValue = document.getElementById(`area-opacity-value-${type}`);
        const areaFillColorPicker = document.getElementById(`area-fill-color-picker-${type}`);
        const toolbarButtons = document.querySelectorAll(`#${toolbarId} .toolbar-btn`);
        const toolPanels = document.querySelectorAll(`#${panelContainerId} .tool-panel`);
        const closePanelButtons = document.querySelectorAll(`#${panelContainerId} .close-panel-btn`);
        const reportFaskesNameInput = document.getElementById(`report-faskes-name-${type}`);
        const reportFaskesIdInput = document.getElementById(`report-faskes-id-${type}`);
        const reportTypeSelect = document.getElementById(`report-type-${type}`);
        const reportDescriptionTextarea = document.getElementById(`report-description-${type}`);
        const submitReportBtn = document.getElementById(`submit-report-btn-${type}`);
        const reportStatusMessage = document.getElementById(`report-status-message-${type}`);
        const downloadJsonBtn = document.getElementById(`download-json-btn-${type}`);
        const downloadCsvBtn = document.getElementById(`download-csv-btn-${type}`);
        const downloadPdfBtn = document.getElementById(`download-pdf-btn-${type}`);
        
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' });
        const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors & © CARTO' });
        const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri' });
        const positron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap contributors & © CARTO' });
        const esriWorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles © Esri' });
        const stamenTonerLite = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png?api_key=1a256c84-864d-4947-901f-3d4253483521', { minZoom: 0, maxZoom: 20, attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors' });
        const stamenWatercolor = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=1a256c84-864d-4947-901f-3d4253483521', { minZoom: 1, maxZoom: 16, attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors' });
        const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', subdomains: 'abcd', maxZoom: 20 });
        let activeBasemap = cartoVoyager;
        
        if (type === 'faskes' && !mapFaskes) {
            mapFaskes = L.map(mapId, { center: [-7.782645412028939, 110.3670756957299], zoom: 13, layers: [activeBasemap], zoomControl: false });
            currentMap = mapFaskes;
        } else if (type === 'fasum' && !mapFasum) {
            mapFasum = L.map(mapId, { center: [-7.782645412028939, 110.3670756957299], zoom: 13, layers: [activeBasemap], zoomControl: false });
            currentMap = mapFasum;
        } else {
            currentMap = (type === 'faskes') ? mapFaskes : mapFasum;
            currentMap.eachLayer(function (layer) { if (layer !== activeBasemap && !layer._url) { currentMap.removeLayer(layer); } });
            layerGroup = L.layerGroup().addTo(currentMap); allData = null; markerLayers = {}; routingControl = null; userLocationMarker = null; categoryChart = null; routingOrigin = null; radiusCircle = null; radiusCenterMarker = null; isRadiusSelectionMode = false; isCustomRoutingMode = false; customRouteWaypoints = []; temporaryMarkersLayer = L.layerGroup().addTo(currentMap); geocodeMarker = null; activeGeoJsonLayer = null; batasWilayahGeoJson = null; if (heatmapLayer && currentMap.hasLayer(heatmapLayer)) currentMap.removeLayer(heatmapLayer); if (heatmapLegend && currentMap.hasLayer(heatmapLegend)) currentMap.removeControl(heatmapLegend);
        }

        L.control.zoom({ position: 'topright' }).addTo(currentMap);
        layerGroup = L.layerGroup().addTo(currentMap);
        temporaryMarkersLayer = L.layerGroup().addTo(currentMap);
        const userIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', iconSize: [32, 32] });
        const genericMarkerIcon = getMarkerIcon({ Kategori: 'Lainnya' }, { width: 34, height: 48 }, type);
        const geocodeMarkerIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/447/447031.png', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
        const baseMaps = { "Klasik (Voyager)": cartoVoyager, "Minimalis (Positron)": positron, "Artistik (Watercolor)": stamenWatercolor, "Hitam Putih (Toner)": stamenTonerLite, "Peta Jalan (OSM)": osm, "Peta Jalan (Esri)": esriWorldStreetMap, "Mode Gelap": dark, "Satelit": satellite };
        const overlayMaps = {};
        const layerControl = L.control.layers(baseMaps, overlayMaps, { position: 'topright', collapsed: true }).addTo(currentMap);
        
        const layerGroupName = type === 'faskes' ? "Marker Faskes" : "Marker Fasum";
        layerControl.addOverlay(layerGroup, layerGroupName);

    

        const basemapOpacityContainer = document.createElement('div');
        basemapOpacityContainer.className = 'basemap-opacity-container';
        basemapOpacityContainer.innerHTML = `<label for="basemap-opacity-slider-${type}">Opasitas Basemap:</label><input id="basemap-opacity-slider-${type}" type="range" min="0.1" max="1" step="0.1" value="1">`;
        layerControl.getContainer().querySelector('.leaflet-control-layers-base').appendChild(basemapOpacityContainer);
        const basemapOpacitySlider = document.getElementById(`basemap-opacity-slider-${type}`);
        basemapOpacitySlider.addEventListener('input', function(e) { const newOpacity = parseFloat(e.target.value); if (activeBasemap) { activeBasemap.setOpacity(newOpacity); } });
        currentMap.on('baselayerchange', function(e) { activeBasemap = e.layer; const currentOpacity = parseFloat(basemapOpacitySlider.value); activeBasemap.setOpacity(currentOpacity); });
        L.Control.HeatmapLegend = L.Control.extend({ onAdd: function(map) { const container = L.DomUtil.create('div', 'info legend heatmap-legend'); container.innerHTML = '<h4>Kepadatan Penduduk</h4><div class="legend-gradient"></div><div class="legend-labels"><span>Rendah</span><span>Tinggi</span></div>'; return container; }, onRemove: function(map) {} });
        heatmapLegend = new L.Control.HeatmapLegend({ position: 'bottomright' });
        currentMap.on('overlayadd', function(e) { if (e.layer === heatmapLayer) { heatmapLegend.addTo(currentMap); } });
        currentMap.on('overlayremove', function(e) { if (e.layer === heatmapLayer) { currentMap.removeControl(heatmapLegend); } });
        L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(currentMap);
        function closeAllPanels() { toolPanels.forEach(panel => panel.classList.remove('visible')); toolbarButtons.forEach(btn => btn.classList.remove('active')); mainContainer.classList.remove('panel-visible'); setTimeout(() => currentMap.invalidateSize(), 310); }
        toolbarButtons.forEach(button => { button.addEventListener('click', () => { const targetPanelId = button.dataset.panelId; const targetPanel = document.getElementById(targetPanelId); const isAlreadyActive = button.classList.contains('active'); closeAllPanels(); if (!isAlreadyActive) { button.classList.add('active'); targetPanel.classList.add('visible'); mainContainer.classList.add('panel-visible'); setTimeout(() => currentMap.invalidateSize(), 310); } }); });
        closePanelButtons.forEach(button => { button.addEventListener('click', closeAllPanels); });
        L.Control.CustomButtons = L.Control.extend({ onAdd: function(map) { const container = L.DomUtil.create('div', 'leaflet-bar custom-control-container'); const homeBtn = L.DomUtil.create('a', '', container); homeBtn.innerHTML = '🏠'; homeBtn.href = '#'; homeBtn.id = `home-btn-map-${type}`; homeBtn.title = 'Kembali ke Tampilan Awal Peta'; homeBtn.setAttribute('role', 'button'); const exitBtn = L.DomUtil.create('a', '', container); exitBtn.innerHTML = '↩'; exitBtn.href = '#'; exitBtn.id = `exit-btn-map-${type}`; exitBtn.title = 'Kembali ke Halaman Utama'; exitBtn.setAttribute('role', 'button'); L.DomEvent.disableClickPropagation(container); L.DomEvent.on(homeBtn, 'click', async function(e) { e.preventDefault(); map.flyTo([-7.782645412028939, 110.3670756957299], 13); clearRoute(); clearRadiusSearch(); if (userLocationMarker) map.removeLayer(userLocationMarker); if (geocodeMarker) map.removeLayer(geocodeMarker); routingOrigin = null; map.getContainer().style.cursor = ''; hideStatus(); closeAllPanels(); categoryFilterDropdown.value = 'Semua'; await displayFeatures(); }); L.DomEvent.on(exitBtn, 'click', function(e) { e.preventDefault(); if (confirm("Apakah Anda yakin ingin kembali ke halaman utama?")) { document.getElementById(`app-container-${type}`).style.display = 'none'; landingPage.style.display = 'block'; if (currentMap) currentMap.invalidateSize(); } }); return container; }, onRemove: function(map) {} });
        new L.Control.CustomButtons({ position: 'topright' }).addTo(currentMap);
        function updateStatsCard(features) { document.getElementById(`rs-count-${type}`).textContent = features.length; if (features.length === 0) { document.getElementById(`kategori-terbanyak-${type}`).textContent = '-'; document.getElementById(`kategori-tersedikit-${type}`).textContent = '-'; return; } const categoryProperty = (type === 'faskes') ? 'Kategori' : 'Kategori'; const categoryCounts = features.reduce((acc, f) => { const cat = f.properties[categoryProperty] || 'Lainnya'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {}); const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]); document.getElementById(`kategori-terbanyak-${type}`).textContent = `${sortedCategories[0][0]} (${sortedCategories[0][1]})`; document.getElementById(`kategori-tersedikit-${type}`).textContent = `${sortedCategories[sortedCategories.length - 1][0]} (${sortedCategories[sortedCategories.length - 1][1]})`; }
        function updateChart(features) {
            const ctx = document.getElementById(`category-chart-${type}`).getContext('2d');
            const categoryProperty = (type === 'faskes') ? 'Kategori' : 'Kategori';
            const categoryCounts = features.reduce((acc, f) => { const cat = f.properties[categoryProperty] || 'Lainnya'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {});
            const labels = Object.keys(categoryCounts);
            const dataValues = Object.values(categoryCounts);
            const backgroundColors = labels.map(label => getCategoryStyle({ [categoryProperty]: label }, type).color);
            if (categoryChart) { categoryChart.destroy(); }
            categoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: { labels: labels, datasets: [{ label: `Jumlah Fasilitas`, data: dataValues, backgroundColor: backgroundColors, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 10 }] },
                options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'right', labels: { font: { family: 'Poppins', size: 11 }, boxWidth: 15, padding: 15 } }, title: { display: true, text: `Proporsi Kategori ${type === 'faskes' ? 'Faskes' : 'Fasilitas Umum'}`, font: { size: 16, family: 'Poppins' }, padding: { bottom: 20 } }, tooltip: { callbacks: { label: function(context) { const label = context.label || ''; const value = context.raw || 0; const total = context.chart.getDatasetMeta(0).total; const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0; return `${label}: ${value} (${percentage}%)`; } } } } }
            });
        }
        function populateFilter(features) { categoryFilterDropdown.length = 1; const categoryProperty = (type === 'faskes') ? 'Kategori' : 'Kategori'; const categories = [...new Set(features.map(f => f.properties[categoryProperty]).filter(Boolean))].sort(); categories.forEach(cat => { const option = document.createElement('option'); option.value = cat; option.textContent = cat; categoryFilterDropdown.appendChild(option); }); }
        categoryFilterDropdown.addEventListener('change', () => displayFeatures());
        async function fetchData(category = 'Semua') {
            const apiUrl = (type === 'faskes') ? GOOGLE_SHEET_API_URL_FASKES : GOOGLE_SHEET_API_URL_FASUM;
            showStatus(`Memuat data ${type}...`);
            try {
                const url = `${apiUrl}?category=${encodeURIComponent(category)}`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (data.error) throw new Error(`API Error: ${data.error}`);
                if (!data || !Array.isArray(data.features)) { throw new Error("Invalid data format."); }
                hideStatus();
                return data;
            } catch (error) {
                console.error(`Gagal memuat data ${type}:`, error);
                showStatus(`Gagal memuat data ${type}.`, true);
                return { type: "FeatureCollection", features: [] };
            }
        }
        async function displayFeatures() {
            layerGroup.clearLayers();
            markerLayers = {};
            const categoryFilter = categoryFilterDropdown.value; 
            allData = await fetchData(categoryFilter); 
            if (!allData || !allData.features) { updateStatsCard([]); updateChart([]); return; }
            updateStatsCard(allData.features); 
            updateChart(allData.features); 
            activeGeoJsonLayer = L.geoJSON(allData.features);
            const currentZoom = currentMap.getZoom();
            const markerSize = getMarkerSizeForZoom(currentZoom);
            allData.features.forEach(feature => {
                const lat = (type === 'fasum') ? parseFloat(feature.properties.Latitude) : parseFloat(feature.properties.Y);
                const lng = (type === 'fasum') ? parseFloat(feature.properties.Longitude) : parseFloat(feature.properties.X);
                if (isNaN(lat) || isNaN(lng)) { return; }
                if (!feature.geometry || typeof feature.geometry.coordinates === 'undefined' || isNaN(feature.geometry.coordinates[0]) || isNaN(feature.geometry.coordinates[1])) { feature.geometry = { type: "Point", coordinates: [lng, lat] }; }
                const latlng = L.latLng(lat, lng);
                const marker = L.marker(latlng, { icon: getMarkerIcon(feature.properties, markerSize, type) });
                marker.feature = feature;
                marker.bindPopup(createPopupContent(feature.properties, type), { className: 'custom-leaflet-popup' });
                marker.on('click', () => { if (routingOrigin) { createRoute(routingOrigin, feature.properties, type); routingOrigin = null; currentMap.getContainer().style.cursor = ''; hideStatus(); } });
                markerLayers[feature.properties.Nama_Fasil || feature.properties.Nama] = marker;
                marker.addTo(layerGroup);
            });
        }
        searchInput.addEventListener('keyup', (e) => { const query = e.target.value.toLowerCase(); searchResults.innerHTML = ''; if (query.length < 2) { searchResults.style.display = 'none'; return; } if (!allData || !allData.features) return; const nameProperty = (type === 'fasum') ? 'Nama_Fasil' : 'Nama'; const results = allData.features.filter(f => f.properties[nameProperty] && String(f.properties[nameProperty]).toLowerCase().includes(query)); searchResults.style.display = results.length > 0 ? 'block' : 'none'; results.forEach(result => { const item = document.createElement('div'); item.className = 'search-result-item'; item.textContent = result.properties[nameProperty]; item.onclick = () => { closeAllPanels(); const marker = markerLayers[result.properties[nameProperty]]; if (marker) { currentMap.flyTo(marker.getLatLng(), 17); marker.openPopup(); } searchInput.value = result.properties[nameProperty]; searchResults.style.display = 'none'; }; searchResults.appendChild(item); }); });
        
        clearBufferBtn.addEventListener('click', clearRadiusSearch);

        function clearRadiusSearch() {
            if(radiusCircle) currentMap.removeLayer(radiusCircle);
            if(radiusCenterMarker) currentMap.removeLayer(radiusCenterMarker);
            isRadiusSelectionMode = false;
            currentMap.getContainer().style.cursor = '';
            if(clearBufferBtn) clearBufferBtn.style.display = 'none';
            hideStatus();
        }

        function performRadiusSearch(originLatLng, radiusInKm, originName) {
            clearRadiusSearch();
            const radiusInMeters = radiusInKm * 1000;
            radiusCircle = L.circle(originLatLng, { radius: radiusInMeters, color: '#e63946', fillColor: '#e63946', fillOpacity: 0.15 }).addTo(currentMap);
            radiusCenterMarker = L.marker(originLatLng, {icon: L.icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/3503/3503639.png', iconSize: [32, 32]})}).addTo(currentMap).bindPopup(`<b>Pusat Pencarian</b><br>${originName}`).openPopup();
            
            if(clearBufferBtn) clearBufferBtn.style.display = 'block';

            if (!allData || !allData.features) { showStatus(`Tidak ada ${type} ditemukan dalam radius ${radiusInKm} km.`, true); currentMap.flyTo(originLatLng, 13); return; }
            const nameProperty = (type === 'fasum') ? 'Nama_Fasil' : 'Nama';
            const radiusResults = allData.features.filter(f => {
                const featureLatProp = (type === 'fasum') ? 'Latitude' : 'Y';
                const featureLngProp = (type === 'fasum') ? 'Longitude' : 'X';
                if (!f.properties || typeof f.properties[featureLatProp] === 'undefined' || typeof f.properties[featureLngProp] === 'undefined' || String(f.properties[nameProperty]) === String(originName)) return false;
                const faskesLat = parseFloat(f.properties[featureLatProp]);
                const faskesLng = parseFloat(f.properties[featureLngProp]);
                if (isNaN(faskesLat) || isNaN(faskesLng)) { return false; }
                const faskesLatLng = L.latLng(faskesLat, faskesLng);
                return originLatLng.distanceTo(faskesLatLng) <= radiusInMeters;
            });
            if (radiusResults.length > 0) { currentMap.flyToBounds(radiusCircle.getBounds().pad(0.1)); showStatus(`${radiusResults.length} ${type} ditemukan di sekitar Anda.`); } else { currentMap.flyTo(originLatLng, 13); showStatus(`Tidak ada ${type} lain yang ditemukan dalam radius ${radiusInKm} km.`, true); }
        }
        
        radiusSlider.addEventListener('input', (e) => { radiusValue.textContent = `${e.target.value} km`; });
        findByMyLocationBtn.addEventListener('click', () => { showStatus('Mencari lokasi Anda...'); navigator.geolocation.getCurrentPosition(position => { const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude); const radiusInKm = parseInt(radiusSlider.value); performRadiusSearch(userLatLng, radiusInKm, "Lokasi Anda"); }, (error) => { showStatus('Gagal mendapatkan lokasi. Pastikan izin lokasi diaktifkan.', true); }); });
        findByMapClickBtn.addEventListener('click', () => { clearRoute(); isRadiusSelectionMode = true; closeAllPanels(); showStatus('Mode Pilih Radius: Klik di peta untuk menjadi pusat pencarian.'); currentMap.getContainer().style.cursor = 'crosshair'; });
        window[`searchRadiusFromFaskes_${type}`] = function(lat, lng, name) { currentMap.closePopup(); const originLatLng = L.latLng(lat, lng); const radiusInKm = parseInt(radiusSlider.value); performRadiusSearch(originLatLng, radiusInKm, name); };
        
        clearRouteBtn.addEventListener('click', clearRoute);

        function clearRoute() {
            if (routingControl) { currentMap.removeControl(routingControl); routingControl = null; }
            if(temporaryMarkersLayer) { temporaryMarkersLayer.clearLayers(); }
            isCustomRoutingMode = false;
            customRouteWaypoints = [];
            currentMap.getContainer().style.cursor = '';
            if (clearRouteBtn) { clearRouteBtn.style.display = 'none'; }
            hideStatus();
        }
        
        window[`requestRouteFromUser_${type}`] = function(lat, lng) { 
            showStatus('Mencari lokasi Anda untuk membuat rute...');
            navigator.geolocation.getCurrentPosition(position => {
                clearRoute(); 
                const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
                routingControl = L.Routing.control({ waypoints: [userLatLng, L.latLng(lat, lng)], routeWhileDragging: true, router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }), createMarker: function(i, waypoint, n) { const icon = (i === 0) ? userIcon : genericMarkerIcon; const title = (i === 0) ? "Lokasi Anda" : "Tujuan"; return L.marker(waypoint.latLng, { icon: icon, title: title, draggable: true }); } }).addTo(currentMap);
                if (clearRouteBtn) { clearRouteBtn.style.display = 'block'; }
            }, (error) => { showStatus('Gagal mendapatkan lokasi Anda. Izin lokasi diperlukan.', true); });
        }
        
        window[`setRoutingStart_${type}`] = function(lat, lng, name) { clearRoute(); routingOrigin = { lat, lng, name }; closeAllPanels(); showStatus(`Mode Rute: Titik awal di "${name}". Klik ${type === 'faskes' ? 'faskes' : 'fasilitas umum'} lain sebagai tujuan.`); currentMap.getContainer().style.cursor = 'crosshair'; currentMap.closePopup(); }
        
        function createRoute(origin, destinationProps, type) {
            clearRoute();
            const originLatLng = L.latLng(origin.lat, origin.lng);
            const destinationLat = (type === 'fasum') ? parseFloat(destinationProps.Latitude) : parseFloat(destinationProps.Y);
            const destinationLng = (type === 'fasum') ? parseFloat(destinationProps.Longitude) : parseFloat(destinationProps.X);
            const destinationLatLng = L.latLng(destinationLat, destinationLng); 
            if (isNaN(destinationLatLng.lat) || isNaN(destinationLatLng.lng)) { showStatus('Gagal membuat rute: Koordinat tujuan tidak valid.', true); return; }
            const nameProperty = (type === 'fasum') ? 'Nama_Fasil' : 'Nama';
            const originMarker = markerLayers[origin.name];
            const destinationMarker = markerLayers[destinationProps[nameProperty]];
            const originIcon = originMarker ? originMarker.options.icon : genericMarkerIcon;
            const destinationIcon = destinationMarker ? destinationMarker.options.icon : genericMarkerIcon;
            routingControl = L.Routing.control({ waypoints: [ L.Routing.waypoint(originLatLng, origin.name), L.Routing.waypoint(destinationLatLng, destinationProps[nameProperty]) ], routeWhileDragging: true, router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }), createMarker: (i, wp) => L.marker(wp.latLng, { icon: (i === 0) ? originIcon : destinationIcon, draggable: true }) }).addTo(currentMap);
            if (clearRouteBtn) { clearRouteBtn.style.display = 'block'; }
        }
        
        customRouteBtn.addEventListener('click', () => { clearRadiusSearch(); clearRoute(); isCustomRoutingMode = true; customRouteWaypoints = []; temporaryMarkersLayer.addTo(currentMap); closeAllPanels(); showStatus('Mode Rute Aktif: Klik di peta untuk menentukan Titik Awal.'); currentMap.getContainer().style.cursor = 'crosshair'; });
        
        currentMap.on('click', function(e) { 
            if (isCustomRoutingMode) {
                customRouteWaypoints.push(e.latlng); 
                if (customRouteWaypoints.length === 1) { 
                    L.marker(e.latlng).addTo(temporaryMarkersLayer).bindPopup('Titik Awal').openPopup(); 
                    showStatus('Titik Awal diatur. Klik lagi untuk Titik Akhir.'); 
                } else if (customRouteWaypoints.length === 2) { 
                    currentMap.closePopup(); 
                    showStatus('Menghitung rute...'); 
                    temporaryMarkersLayer.clearLayers(); 
                    routingControl = L.Routing.control({ waypoints: [ customRouteWaypoints[0], customRouteWaypoints[1] ], routeWhileDragging: true, router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', language: 'id' }), show: true, collapsible: true }).on('routesfound', function(e) { 
                        hideStatus(); 
                        if (clearRouteBtn) { clearRouteBtn.style.display = 'block'; }
                    }).on('routingerror', function(e) { showStatus('Gagal menemukan rute.', true); isCustomRoutingMode = false; currentMap.getContainer().style.cursor = ''; }).addTo(currentMap); 
                    isCustomRoutingMode = false; 
                    currentMap.getContainer().style.cursor = ''; 
                } 
            } else if (isRadiusSelectionMode) { 
                const radiusInKm = parseInt(radiusSlider.value); 
                performRadiusSearch(e.latlng, radiusInKm, `Titik Pilihan`); 
                isRadiusSelectionMode = false; 
                currentMap.getContainer().style.cursor = ''; 
            } 
        });
        
        function showStatus(message, autoHide = false) { statusPanel.textContent = message; statusPanel.style.display = 'block'; if (autoHide) { setTimeout(hideStatus, 5000); } }
        function hideStatus() { statusPanel.style.display = 'none'; }
        
        async function geocodeAddress(address) { geocodeResultsDiv.innerHTML = ''; if (geocodeMarker) { currentMap.removeLayer(geocodeMarker); geocodeMarker = null; } clearRoute(); showStatus(`Mencari alamat: "${address}"...`); try { const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}, Yogyakarta, Indonesia&limit=5&addressdetails=1&bounded=1&viewbox=110.1, -7.9, 110.5, -7.7`; const response = await fetch(url); const data = await response.json(); if (data && data.length > 0) { hideStatus(); data.forEach(result => { const item = document.createElement('div'); item.className = 'geocode-result-item'; item.textContent = result.display_name; item.onclick = () => { const latlng = L.latLng(result.lat, result.lon); if (geocodeMarker) { currentMap.removeLayer(geocodeMarker); } geocodeMarker = L.marker(latlng, { icon: geocodeMarkerIcon }).addTo(currentMap).bindPopup(`<b>${result.display_name}</b><br><button class="popup-button" onclick="window.setRoutingStart_${type}(${result.lat}, ${result.lon}, '${result.display_name.replace(/'/g, "\\'")}')">Jadikan Titik Awal Rute</button>`).openPopup(); currentMap.flyTo(latlng, 16); geocodeResultsDiv.innerHTML = ''; addressSearchInput.value = result.display_name; }; geocodeResultsDiv.appendChild(item); }); } else { showStatus(`Alamat "${address}" tidak ditemukan di Yogyakarta.`, true); } } catch (error) { console.error('Error geocoding:', error); showStatus('Gagal mencari alamat.', true); } }
        geocodeAddressBtn.addEventListener('click', () => { const address = addressSearchInput.value.trim(); if (address) { geocodeAddress(address); } });
        addressSearchInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') { const address = addressSearchInput.value.trim(); if (address) { geocodeAddress(address); } } });
        areaColorPicker.addEventListener('input', function() { if (batasWilayahGeoJson) { batasWilayahGeoJson.setStyle({ color: this.value }); } });
        areaFillColorPicker.addEventListener('input', function() { if (batasWilayahGeoJson) { batasWilayahGeoJson.setStyle({ fillColor: this.value }); } });
        areaOpacitySlider.addEventListener('input', function() { const opacity = parseFloat(this.value); areaOpacityValue.textContent = opacity; if (batasWilayahGeoJson) { batasWilayahGeoJson.setStyle({ opacity: opacity, fillOpacity: opacity * 0.2 }); } });
        function getMarkerSizeForZoom(zoom) { if (zoom >= 15) { return { width: 34, height: 48 }; } else if (zoom === 14) { return { width: 28, height: 40 }; } else if (zoom === 13) { return { width: 22, height: 31 }; } else { return { width: 16, height: 23 }; } }
        currentMap.on('zoomend', function() { const currentZoom = currentMap.getZoom(); const newSize = getMarkerSizeForZoom(currentZoom); layerGroup.eachLayer(function(marker) { if (marker.feature && marker.feature.properties) { const newIcon = getMarkerIcon(marker.feature.properties, newSize, type); marker.setIcon(newIcon); } }); });
        Promise.all([ fetchData('Semua'), fetch('data/batas_desa.geojson').then(res => res.json()) ]).then(([initialFeaturesData, areaData]) => { allData = initialFeaturesData || { type: "FeatureCollection", features: [] }; populateFilter(allData.features); displayFeatures(); if (areaData) { batasWilayahGeoJson = L.geoJSON(areaData, { style: function (feature) { return { color: areaColorPicker.value, weight: 3, opacity: parseFloat(areaOpacitySlider.value), fillColor: areaFillColorPicker.value, fillOpacity: parseFloat(areaOpacitySlider.value) * 0.2 }; }, onEachFeature: function (feature, layer) { if (feature.properties) { const props = feature.properties; const attributesToShow = { 'KECAMATAN':  { label: 'Kecamatan',  icon: 'fas fa-landmark' }, 'KAB_KOTA':   { label: 'Kab./Kota',  icon: 'fas fa-city' }, 'JUMLAH_PEN': { label: 'Penduduk',   icon: 'fas fa-users' }, 'JUMLAH_KK':  { label: 'Keluarga',   icon: 'fas fa-house-user' } }; const title = props.DESA || props.DESA_KELUR || 'Informasi Area'; let popupContent = `<div class="area-popup-content"><h4 class="area-popup-title"><i class="fas fa-map-pin"></i> ${title}</h4><div class="area-attributes">`; for (const key in attributesToShow) { if (props[key] !== undefined && props[key] !== null) { const attr = attributesToShow[key]; const value = (key === 'JUMLAH_PEN' || key === 'JUMLAH_KK') ? Number(props[key]).toLocaleString('id-ID') : props[key]; popupContent += `<div class="area-attribute-item"><i class="${attr.icon}"></i><div class="attribute-text"><strong>${attr.label}</strong><span>${value}</span></div></div>`; } } popupContent += `</div></div>`; layer.bindPopup(popupContent, { minWidth: 260 }); } } }).addTo(currentMap); layerControl.addOverlay(batasWilayahGeoJson, "Batas Area"); const heatData = []; if (batasWilayahGeoJson) { batasWilayahGeoJson.eachLayer(function(layer) { if (layer.feature && layer.feature.properties && typeof layer.feature.properties.JUMLAH_PEN === 'number') { const center = layer.getBounds().getCenter(); const population = layer.feature.properties.JUMLAH_PEN; if (!isNaN(center.lat) && !isNaN(center.lng)) { heatData.push([center.lat, center.lng, population]); } } }); } heatmapLayer = L.heatLayer(heatData, { radius: 40, blur: 10, maxZoom: 16, max: 16000, gradient: { 0.3: 'blue', 0.5: 'lime', 1: 'red' } }); layerControl.addOverlay(heatmapLayer, "Heatmap Kepadatan Penduduk"); } }).catch(err => { console.error('Gagal memuat data awal.', err); showStatus('Gagal memuat data awal.', true); });
        function getActiveFeatures() { return allData ? allData.features : []; }
        if (downloadJsonBtn) { downloadJsonBtn.addEventListener('click', function() { const features = getActiveFeatures(); if (!features || features.length === 0) { alert('Tidak ada data untuk diunduh.'); return; } const geojsonToDownload = { "type": "FeatureCollection", "features": features }; const dataStr = JSON.stringify(geojsonToDownload, null, 2); const dataBlob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(dataBlob); const a = document.createElement('a'); a.href = url; const filterValue = categoryFilterDropdown.value.toLowerCase().replace(/ /g, '_'); a.download = `data_${type}_${filterValue}.geojson`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showStatus('File JSON disiapkan!', true); }); }
        function generateAndDownloadCsv(features, filename) { if (!features || features.length === 0) return; const headerSet = new Set(); const propertiesToInclude = (type === 'faskes') ? ['Nama', 'Kategori', 'Alamat', 'Telepon', 'Kabupaten', 'Kelas', 'Kapasitas', 'Jam_Operasi', 'Layanan', 'Kepemilikan'] : ['Nama_Fasil', 'Jenis_Fasi', 'Lokasi', 'Jam_Operas', 'Harga_Tike', 'Pengelola', 'Keterangan', 'Kategori']; propertiesToInclude.forEach(prop => { if (features.some(f => f.properties.hasOwnProperty(prop))) { headerSet.add(prop); } }); const headers = Array.from(headerSet); headers.push('Longitude', 'Latitude'); const sanitizeCsvField = (field) => { if (field === null || field === undefined) return ''; const str = String(field); if (str.includes(',') || str.includes('"') || str.includes('\n')) { return `"${str.replace(/"/g, '""')}"`; } return str; }; let csvContent = headers.join(',') + '\n'; features.forEach(feature => { const row = headers.map(header => { if (header === 'Longitude') return (type === 'fasum') ? feature.properties.Longitude : (feature.geometry && feature.geometry.coordinates ? feature.geometry.coordinates[0] : ''); if (header === 'Latitude') return (type === 'fasum') ? feature.properties.Latitude : (feature.geometry && feature.geometry.coordinates ? feature.geometry.coordinates[1] : ''); return sanitizeCsvField(feature.properties[header]); }); csvContent += row.join(',') + '\n'; }); const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(dataBlob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
        if (downloadCsvBtn) { downloadCsvBtn.addEventListener('click', function() { const features = getActiveFeatures(); if (!features || features.length === 0) { alert('Tidak ada data untuk diunduh.'); return; } const filterValue = categoryFilterDropdown.value.toLowerCase().replace(/ /g, '_'); generateAndDownloadCsv(features, `data_${type}_${filterValue}.csv`); showStatus('File CSV disiapkan!', true); }); }
        function addTableToPdf(doc, features, title, startY) { if (!features || features.length === 0) return startY; const propertiesToInclude = (type === 'faskes') ? ['Nama', 'Kategori', 'Alamat', 'Telepon', 'Kabupaten', 'Kelas', 'Kapasitas', 'Jam_Operasi', 'Layanan', 'Kepemilikan'] : ['Nama_Fasil', 'Jenis_Fasi', 'Lokasi', 'Jam_Operas', 'Harga_Tike', 'Pengelola', 'Keterangan', 'Kategori']; const headerSet = new Set(); propertiesToInclude.forEach(prop => { if (features.some(f => f.properties.hasOwnProperty(prop))) { headerSet.add(prop); } }); const tableHead = [Array.from(headerSet)]; const tableBody = features.map(feature => { return tableHead[0].map(header => feature.properties[header] || '-'); }); doc.setFontSize(14); doc.text(title, 14, startY); doc.autoTable({ head: tableHead, body: tableBody, startY: startY + 5, theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, styles: { fontSize: 7, cellPadding: 1 }, columnStyles: { text: { cellWidth: 'auto' } } }); return doc.autoTable.previous.finalY; }
        if (downloadPdfBtn) { downloadPdfBtn.addEventListener('click', function() { const features = getActiveFeatures(); if (!features || features.length === 0) { alert('Tidak ada data untuk diunduh.'); return; } const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape' }); const filterValue = categoryFilterDropdown.value; doc.setFontSize(18); doc.text(`Laporan Data ${type === 'faskes' ? 'Fasilitas Kesehatan' : 'Fasilitas Umum'}`, 14, 15); addTableToPdf(doc, features, `Tabel Data ${filterValue}`, 25); const filename = `laporan_${type}_${filterValue.toLowerCase().replace(/ /g, '_')}.pdf`; doc.save(filename); showStatus('File PDF disiapkan!', true); }); }
        async function sendReport(reportData) { reportStatusMessage.textContent = 'Mengirim laporan...'; reportStatusMessage.style.color = '#0077b6'; const apiUrl = (type === 'faskes') ? GOOGLE_SHEET_API_URL_FASKES : GOOGLE_SHEET_API_URL_FASUM; try { const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(reportData) }); if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error! status: ${response.status} - ${errorText}`); } const result = await response.json(); if (result.success) { reportStatusMessage.textContent = result.message; reportStatusMessage.style.color = 'green'; reportFaskesNameInput.value = ''; reportFaskesIdInput.value = ''; reportTypeSelect.value = ''; reportDescriptionTextarea.value = ''; } else { throw new Error(result.message || 'Respons API tidak berhasil.'); } } catch (error) { console.error('Error sending report:', error); reportStatusMessage.textContent = `Gagal: ${error.message}`; reportStatusMessage.style.color = 'red'; } finally { setTimeout(() => { reportStatusMessage.textContent = ''; reportStatusMessage.style.color = ''; }, 5000); } }
        submitReportBtn.addEventListener('click', () => { const faskesName = reportFaskesNameInput.value.trim(); const faskesId = reportFaskesIdInput.value.trim(); const reportType = reportTypeSelect.value; const description = reportDescriptionTextarea.value.trim(); if (!faskesName || !reportType || !description) { reportStatusMessage.textContent = 'Mohon lengkapi semua kolom yang wajib.'; reportStatusMessage.style.color = 'orange'; return; } const reportData = { NamaFaskes: faskesName, FaskesID: faskesId, JenisLaporan: reportType, Deskripsi: description, TipeAplikasi: type }; sendReport(reportData); });
        currentMap.on('popupopen', function(e) { const popupElement = e.popup.getElement(); const liveReportBtn = popupElement.querySelector('.report-faskes-btn'); if (liveReportBtn) { liveReportBtn.addEventListener('click', () => { const faskesName = liveReportBtn.dataset.faskesName; const faskesId = liveReportBtn.dataset.faskesId; document.getElementById(`panel-report-${type}`).classList.add('visible'); mainContainer.classList.add('panel-visible'); reportFaskesNameInput.value = faskesName; reportFaskesIdInput.value = faskesId; setTimeout(() => currentMap.invalidateSize(), 310); currentMap.closePopup(); }); } });
    
    } 
});