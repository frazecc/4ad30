// ====================================================================
// CONFIGURAZIONE (DATI FORNITI DAL'UTENTE)
// ====================================================================

// L'ID della tua cartella madre 'PIC PER SITO'
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// Chiave API fornita
const API_KEY = 'AIzaSyBPO2PX97SpA_2XqXjv-iR_Hjxr-RY7v7I'; 


// ====================================================================
// FUNZIONI DI BASE
// ====================================================================

/**
 * Visualizza il PDF selezionato nel div 'pdf-viewer' usando l'embed di Google Drive.
 * @param {string} fileId - L'ID univoco del file PDF su Google Drive.
 */
function displayPdf(fileId) {
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    
    const viewerElement = document.getElementById('pdf-viewer');
    viewerElement.innerHTML = `<iframe src="${embedUrl}" width="100%" height="600px" frameborder="0"></iframe>`;
}


/**
 * Costruisce la lista HTML dei file PDF per una data cartella (ricorsiva).
 * @param {string} parentId - L'ID della cartella da elaborare.
 * @param {Array<Object>} elements - Tutti i file e le cartelle recuperati dall'API.
 * @param {HTMLElement} targetElement - L'elemento HTML in cui iniettare la lista (la colonna div o la <li> della sottocartella).
 */
function renderFileList(parentId, elements, targetElement) {
    // Trova solo i PDF e le eventuali sottocartelle che sono figli diretti di parentId
    const children = elements.filter(el => 
        el.parents && el.parents.includes(parentId) && 
        (el.mimeType === 'application/pdf' || el.mimeType === 'application/vnd.google-apps.folder')
    );
    
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
            li.textContent = item.name;
            li.classList.add('document-link');
            li.onclick = () => displayPdf(item.id);
            ul.appendChild(li); 
        } else {
            // È una sottocartella (annidata)
            li.innerHTML = `<strong>${item.name}</strong>`;
            li.classList.add('sub-folder-title');
            ul.appendChild(li); // Aggiunge il titolo della sottocartella

            // Chiama la ricorsione: attacca la lista dei contenuti alla <li> corrente
            // Questo crea una lista annidata all'interno della lista principale.
            renderFileList(item.id, elements, li); 
        }
    });
    
    // AGGIORNAMENTO CRUCIALE: Attacca la lista <ul> al targetElement (la colonna o la <li> genitore)
    if (ul.children.length > 0) {
        targetElement.appendChild(ul);
    }
}


// ====================================================================
// FUNZIONE PRINCIPALE: RECUPERO DATI API E COSTRUZIONE COLONNE
// ====================================================================

function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '<p>Caricamento struttura Drive...</p>';
    
    // Query API che recupera tutti i file e cartelle non cestinati che sono figli diretti della cartella radice,
    // o cartelle in generale (per coprire le sottocartelle)
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+or+mimeType='application/vnd.google-apps.folder'+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                columnsContainer.innerHTML = `<p style="color:red;">Errore API: ${data.error.message}. Controlla la chiave API o i permessi di Drive.</p>`;
                console.error('API Error:', data.error);
                return;
            }
            
            columnsContainer.innerHTML = ''; // Pulisce il messaggio di caricamento
            
            const allElements = data.files || [];
            
            // 1. Identifica le SOTTOCARTELLE PRINCIPALI (quelle sotto FOLDER_ID)
            const mainFolders = allElements.filter(el => 
                el.parents && el.parents.includes(FOLDER_ID) && 
                el.mimeType === 'application/vnd.google-apps.folder'
            );

            // 2. Ordina alfabeticamente le cartelle principali
            mainFolders.sort((a, b) => a.name.localeCompare(b.name));

            // 3. Genera una colonna per OGNI cartella principale
            mainFolders.forEach(folder => {
                const columnDiv = document.createElement('div');
                columnDiv.classList.add('document-column');

                // Titolo della Colonna
                columnDiv.innerHTML = `<h2>${folder.name}</h2>`;

                // Popola la colonna con i contenuti della cartella (ricorsivamente)
                renderFileList(folder.id, allElements, columnDiv);
                
                columnsContainer.appendChild(columnDiv);
            });
            
             if (mainFolders.length === 0) {
                 columnsContainer.innerHTML = '<p>Nessuna sottocartella principale trovata.</p>';
             }
            
        })
        .catch(error => {
            console.error('Errore durante la connessione all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive. Controlla la tua connessione e la chiave API.</p>';
        });
}

document.addEventListener('DOMContentLoaded', listFilesInFolder);
