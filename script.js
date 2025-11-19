// ====================================================================
// CONFIGURAZIONE
// ====================================================================

// L'ID della tua cartella madre 'PIC PER SITO' (non modificare)
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// 🛑 IMPORTANTE: SOSTITUISCI CON LA TUA CHIAVE API REALE
const API_KEY = 'AIzaSyBPO2PX97SpA_2XqXjv-iR_Hjxr-RY7v7I'; 


// ====================================================================
// FUNZIONI DI VISUALIZZAZIONE E RICERCA ELEMENTI
// ====================================================================

/**
 * Visualizza il PDF selezionato nel div 'pdf-viewer' usando l'embed di Google Drive.
 * @param {string} fileId - L'ID univoco del file PDF su Google Drive.
 */
function displayPdf(fileId) {
    // URL di embed di Google Drive per la visualizzazione
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    
    const viewerElement = document.getElementById('pdf-viewer');
    // Inserisce l'iFrame nella sezione di visualizzazione
    viewerElement.innerHTML = `<iframe src="${embedUrl}" width="100%" height="600px" frameborder="0"></iframe>`;
}


/**
 * Costruisce ricorsivamente la lista HTML (ul/li) basandosi sulla struttura parent-child.
 * @param {string} parentId - L'ID della cartella genitore da elaborare.
 * @param {Array<Object>} elements - Tutti i file e le cartelle recuperati dall'API.
 * @param {HTMLElement} targetElement - L'elemento HTML in cui iniettare la lista.
 */
function renderTree(parentId, elements, targetElement) {
    // Trova tutti gli elementi (file/cartelle) che hanno parentId come loro genitore
    const children = elements.filter(el => el.parents && el.parents.includes(parentId));
    
    // Ordina prima le cartelle, poi i file, in ordine alfabetico
    children.sort((a, b) => {
        const isFolderA = a.mimeType === 'application/vnd.google-apps.folder';
        const isFolderB = b.mimeType === 'application/vnd.google-apps.folder';

        // Metti le cartelle prima dei file
        if (isFolderA && !isFolderB) return -1;
        if (!isFolderA && isFolderB) return 1;
        
        // Ordina alfabeticamente
        return a.name.localeCompare(b.name);
    });

    const ul = document.createElement('ul');
    
    children.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name;
        
        const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
        
        if (!isFolder && item.mimeType === 'application/pdf') {
            // È un file PDF: rendilo cliccabile per la visualizzazione
            li.classList.add('document-link');
            li.onclick = () => displayPdf(item.id);
        } else if (isFolder) {
            // È una cartella: aggiungi uno stile specifico e richiama la ricorsione
            li.classList.add('folder');
            
            // Richiama ricorsivamente la funzione per costruire le sottocartelle
            renderTree(item.id, elements, li); 
        }
        ul.appendChild(li);
    });
    
    targetElement.appendChild(ul);
}


// ====================================================================
// FUNZIONE PRINCIPALE: RECUPERO DATI API
// ====================================================================

/**
 * Avvia il processo: recupera tutti i file e le cartelle dalla cartella radice 
 * su Google Drive e avvia la costruzione della struttura HTML.
 */
function listFilesInFolder() {
    const fileListElement = document.getElementById('lista-file');
    fileListElement.innerHTML = '<li>Caricamento struttura Drive...</li>';
    
    // Query che recupera TUTTI i file e cartelle non cestinati (trashed=false) 
    // che sono figli diretti o indiretti di FOLDER_ID.
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                fileListElement.innerHTML = `<li>Errore API: ${data.error.message}. Controlla la chiave API e le autorizzazioni.</li>`;
                console.error('API Error:', data.error);
                return;
            }
            
            fileListElement.innerHTML = ''; // Pulisce il messaggio di caricamento
            
            const allElements = data.files || [];
            
            if (allElements.length === 0) {
                 fileListElement.innerHTML = '<li>Nessun file o cartella trovato sotto la radice.</li>';
                 return;
            }
            
            // Avvia la costruzione dell'albero HTML a partire dalla cartella radice
            // La radice dell'albero nel Drive è la cartella con FOLDER_ID
            renderTree(FOLDER_ID, allElements, fileListElement);
            
        })
        .catch(error => {
            console.error('Errore durante la connessione all\'API:', error);
            fileListElement.innerHTML = '<li>Impossibile connettersi a Google Drive. Controlla la tua connessione e la chiave API.</li>';
        });
}

// Avvia la funzione non appena la pagina ha finito di caricare
document.addEventListener('DOMContentLoaded', listFilesInFolder);
