// ====================================================================
// CONFIGURAZIONE (DATI FORNITI DALL'UTENTE)
// ====================================================================

// L'ID della tua cartella madre 'PIC PER SITO'
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// NUOVA Chiave API fornita
const API_KEY = 'AIzaSyDazhUnmMBqsxXG3C6lHCtgvU7xgaFC_zI'; 


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
 * NOTA BENE: Questa funzione è stata disabilitata per il test di connettività.
 * Non esegue la ricorsione ed è usata solo per la logica di test in listFilesInFolder.
 */
function renderFileList(parentId, elements, targetElement) {
    // Non implementata per questo test
}


// ====================================================================
// FUNZIONE PRINCIPALE: RECUPERO DATI API E COSTRUZIONE COLONNE
// ====================================================================

function listFilesInFolder() {
    const columnsContainer = document.getElementById('colonne-drive');
    columnsContainer.innerHTML = '<p>Test di connessione in corso: cerco solo i file PDF sotto la radice...</p>';
    
    // 🛑 TEST DI CONNESSIONE: Query SEMPLIFICATA per cercare SOLO i PDF figli diretti (senza cartelle)
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType='application/pdf'+and+trashed=false&fields=files(id,name,mimeType,parents)&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                // Se c'è ancora un errore 403, il problema è solo l'API Key/permessi Drive.
                columnsContainer.innerHTML = `<p style="color:red; font-weight: bold;">TEST FALLITO (403): Errore API: ${data.error.message}. La chiave API è bloccata.</p>`;
                console.error('API Error (Test):', data.error);
                return;
            }
            
            // Se arriviamo qui, la connessione API FUNZIONA!
            columnsContainer.innerHTML = `<p style="color: green; font-weight: bold;">TEST SUPERATO: Connessione API riuscita. Trovati ${data.files.length} file PDF figli diretti.</p>`;
            
            // QUI DEVE ESSERE INSERITO IL CODICE COMPLETO PER RENDERIZZARE LE COLONNE

        }) 
        .catch(error => { 
            console.error('Errore durante la connessione all\'API:', error);
            columnsContainer.innerHTML = '<p style="color:red;">Impossibile connettersi a Google Drive. Controlla la tua connessione.</p>';
        }); 
} 

document.addEventListener('DOMContentLoaded', listFilesInFolder);
