// ====================================================================
// CONFIGURAZIONE
// ====================================================================

// L'ID della tua cartella madre 'PIC PER SITO'
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// Chiave API funzionante
const API_KEY = 'AIzaSyDazhUnmMBqsxXG3C6lHCtgvU7xgaFC_zI'; 

// Array per tenere traccia degli ID dei file PDF attualmente selezionati.
const selectedFiles = [];


// ====================================================================
// FUNZIONI DI BASE
// ====================================================================

/**
 * Aggiorna il viewer PDF rimuovendo o aggiungendo l'iframe del file selezionato.
 * Il viewer mostrerà tutti i file presenti nell'array 'selectedFiles'.
 */
function updateViewer() {
    const viewerElement = document.getElementById('pdf-viewer');
    
    // Pulisce l'intero viewer
    viewerElement.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        viewerElement.innerHTML = '<p>Seleziona uno o più file PDF per visualizzarli qui.</p>';
        return;
    }

    // Aggiunge un iframe per ogni file selezionato
    selectedFiles.forEach(fileData => {
        const embedUrl = `https://drive.google.com/file/d/${fileData.id}/preview`;
        
        // Crea un contenitore per ogni PDF con il titolo sopra
        const pdfContainer = document.createElement('div');
        pdfContainer.classList.add('pdf-document-container');
        
        const titleHeader = document.createElement('h3');
        titleHeader.textContent = fileData.name;
        pdfContainer.appendChild(titleHeader);
        
        const iframe = document.createElement('iframe');
        iframe.src = embedUrl;
        iframe.width = "100%";
        iframe.height = "600px"; // Puoi regolare questa altezza
        iframe.frameborder = "0";
        
        pdfContainer.appendChild(iframe);
        viewerElement.appendChild(pdfContainer);
    });
}

/**
 * Gestisce la selezione/deselezione di un file PDF.
 * @param {string} fileId - L'ID del file Drive.
 * @param {string} fileName - Il nome del file (per l'intestazione del viewer).
 * @param {boolean} isChecked - Stato della checkbox.
 */
function handleCheckboxChange(fileId, fileName, isChecked) {
    const fileIndex = selectedFiles.findIndex(f => f.id === fileId);

    if (isChecked) {
        // Aggiunge il file all'array se non è già presente
        if (fileIndex === -1) {
            selectedFiles.push({ id: fileId, name: fileName });
        }
    } else {
        // Rimuove il file dall'array se presente
        if (fileIndex > -1) {
            selectedFiles.splice(fileIndex, 1);
        }
    }
    
    // Aggiorna la visualizzazione del viewer
    updateViewer();
}


/**
 * Costruisce la lista HTML dei file PDF e cartelle annidate per un dato parentId.
 * @param {string} parentId - L'ID della cartella genitore.
 * @param {HTMLElement} targetElement - L'elemento in cui iniettare la lista.
 */
function renderFolderContents(parentId, targetElement) {
    // QUERY DETTAGLIO: Cerca i PDF e le sottocartelle dirette sotto parentId.
    const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                targetElement.innerHTML += `<p style="color:red; font-size: 0.8em;">Errore nel caricamento dei contenuti: ${data.error.message}</p>`;
                return;
            }
            
            const children = data.files || [];
            
            // Ordina: Cartelle prime, poi File, in ordine alfabetico
            children.sort((a, b) => {
                const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
                const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';

                if (isFolderA && !isFolderB) return -1;
                if (!isFolderA && isFolderB) return 1;
                return a.name.localeCompare(b.name);
            });

            const ul = document.createElement('ul');
            
            children.forEach(item => {
                const li = document.createElement('li');
                
                const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                
                if (!isFolder) {
                    // È un file PDF
                    if (item.mimeType === 'application/pdf') {
                        // 1. Crea la checkbox
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `pdf-${item.id}`;
                        checkbox.name = item.name;
                        
                        // 2. Aggiunge l'handler per la selezione
                        checkbox.onchange = (e) => handleCheckboxChange(item.id, item.name, e.target.checked);

                        // 3. Crea la label per il testo del file
                        const label = document.createElement('label');
                        label.htmlFor = `pdf-${item.id}`;
                        label.textContent = item.name;

                        // 4. Aggiunge tutto alla lista
                        li.appendChild(checkbox);
                        li.appendChild(label);
                        ul.appendChild(li);
                    }
                } else {
                    // È una sottocartella annidata
                    li.innerHTML = `<strong>${item.name}</strong>`;
                    li.classList.add('sub-folder-title');
                    ul.appendChild(li);
                    
                    // Chiama ricorsivamente per annidare i contenuti
                    renderFolderContents(item.id, li);
                }
            });
            
            if (ul.children.length > 0) {
                targetElement.appendChild(ul);
            }
        })
        .catch(error => {
            console.error('Errore durante la connessione ai contenuti:', error);
        });
}


// ====================================================================
// FUNZIONE PRINCIPALE: RECUPERO DATI API E COSTRUZIONE COLONNE
// ====================================================================

function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    // PRIMA QUERY: Cerca solo le sottocartelle principali (Livello 1)
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Verifica permessi Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            columnsContainer.innerHTML = ''; // Pulisce il messaggio di caricamento
            
            const mainFolders = data.files || [];
            
            // Ordina alfabeticamente le cartelle principali
            mainFolders.sort((a, b) => a.name.localeCompare(b.name));

            // Genera una colonna per OGNI cartella principale
            mainFolders.forEach(folder => {
                const columnDiv = document.createElement('div');
                columnDiv.classList.add('document-column');

                // Titolo della Colonna
                columnDiv.innerHTML = `<h2>${folder.name}</h2>`;

                // Popola la colonna chiamando la funzione di ricerca ricorsiva
                renderFolderContents(folder.id, columnDiv);
                
                columnsContainer.appendChild(columnDiv);
            });
            
             if (mainFolders.length === 0) {
                 columnsContainer.innerHTML = '<p>Nessuna sottocartella principale trovata.</p>';
             }
             
             // Inizializza il viewer
             updateViewer();
        }) 
        .catch(error => { 
            console.error('Errore durante la connessione iniziale all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', listFilesInFolder);
