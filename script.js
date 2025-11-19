// script.js

// L'ID della tua cartella madre 'PIC PER SITO'
const FOLDER_ID = '1mIa9ygyRsmvQyu_ciaIBBL41rmX4j9NI'; 

// 🛑 SOSTITUISCI QUI CON LA TUA VERA CHIAVE API 🛑
// Ho lasciato un segnaposto che inizia con "APIZA" per ricordarti di cambiarlo.
const API_KEY = 'AIzaSyBPO2PX97SpA_2XqXjv-iR_Hjxr-RY7v7I'; 
// (Nota: Ho inserito la chiave che hai fornito, ma per la sicurezza del tuo progetto, 
// NON è una buona pratica lasciare chiavi API nel codice front-end pubblico, 
// se possibile.)

// Funzione principale per recuperare e visualizzare l'elenco dei file
function listFilesInFolder() {
    const fileListElement = document.getElementById('lista-file');
    
    // Costruiamo l'URL di richiesta all'API di Google Drive.
    // Cerchiamo i file che sono figli di FOLDER_ID e richiediamo ID, nome e tipo MIME.
    const url = `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType)&key=${API_KEY}`;
    
    // 1. Esegui la richiesta all'API
    fetch(url)
        .then(response => response.json())
        .then(data => {
            fileListElement.innerHTML = ''; // Pulisce il messaggio di caricamento
            
            if (data.error) {
                // Gestione di un errore API (es. chiave API non valida)
                fileListElement.innerHTML = `<li>⚠️ Errore API: ${data.error.message}. Verifica la chiave API e le autorizzazioni.</li>`;
                console.error("Errore API", data.error);
                return;
            }
            
            // 2. Filtra i risultati per mostrare solo i file PDF
            const pdfFiles = data.files.filter(f => f.mimeType === 'application/pdf');

            if (pdfFiles.length === 0) {
                 fileListElement.innerHTML = '<li>Nessun file PDF trovato in questa cartella. Assicurati che siano pubblici.</li>';
            }
            
            // 3. Crea la lista HTML
            pdfFiles.forEach(file => {
                const listItem = document.createElement('li');
                listItem.textContent = file.name;
                listItem.classList.add('document-link'); // Classe per lo stile CSS
                
                // Quando l'elemento viene cliccato, mostra il PDF
                listItem.onclick = () => displayPdf(file.id); 
                
                fileListElement.appendChild(listItem);
            });
        })
        .catch(error => {
            console.error('Errore durante la connessione all\'API:', error);
            fileListElement.innerHTML = '<li>❌ Impossibile connettersi a Google Drive. Controlla la tua connessione.</li>';
        });
}

// Funzione per visualizzare il PDF usando un iFrame nell'area del visualizzatore
function displayPdf(fileId) {
    // URL di embed di Google Drive per la visualizzazione
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    
    const viewerElement = document.getElementById('pdf-viewer');
    
    // Inserisce l'iFrame nella sezione di visualizzazione
    // L'iframe visualizza il PDF direttamente da Google Drive
    viewerElement.innerHTML = `<iframe src="${embedUrl}" width="100%" height="600px" frameborder="0" allowfullscreen></iframe>`;
}

// Avvia la funzione listFilesInFolder non appena la pagina ha finito di caricare
document.addEventListener('DOMContentLoaded', listFilesInFolder);
