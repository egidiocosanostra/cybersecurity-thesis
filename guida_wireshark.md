# Guida Completa a Wireshark

Questa guida è divisa in due sezioni: una **Guida Base** per iniziare subito a capire cos'è e come usare Wireshark, e una **Guida Avanzata** che scende nel dettaglio delle funzionalità più complesse per l'analisi di rete e la cybersecurity.

---

## Parte 1: Guida Base (Facile)

### Cos'è Wireshark?
Wireshark è l'analizzatore di protocolli di rete (conosciuto anche come "packet sniffer") più utilizzato al mondo. Ti permette di vedere cosa sta succedendo sulla tua rete a livello microscopico. Cattura i "pacchetti" (i blocchi di dati che viaggiano su una rete) e li mostra in modo leggibile.

### A cosa serve?
- Rilevare problemi di rete (es. perché un sito non carica o la rete è lenta).
- Sicurezza informatica (scoprire traffico anomalo, malware, o intrusioni).
- Studio e apprendimento (capire come funzionano i protocolli come HTTP, TCP, DNS).

### I 3 Passaggi per iniziare

1. **Scegliere l'interfaccia di rete:**
   Quando apri Wireshark, vedrai un elenco di connessioni (Wi-Fi, Ethernet, ecc.). Accanto ad alcune vedrai una linea a zig-zag: significa che c'è del traffico. Fai doppio clic su quella che stai usando (es. Wi-Fi) per iniziare.

2. **La schermata di cattura:**
   Appena inizi, vedrai una valanga di righe colorate che scorrono velocemente. Questi sono i pacchetti. La schermata è divisa in tre pannelli:
   - **Elenco pacchetti (In alto):** Mostra un riassunto di ogni pacchetto catturato (numero, tempo, IP sorgente, IP destinazione, protocollo, info).
   - **Dettagli pacchetto (Al centro):** Selezionando un pacchetto in alto, qui puoi esplorare la sua struttura a "livelli" (dal livello fisico al livello applicativo).
   - **Byte del pacchetto (In basso):** Mostra i dati crudi in formato esadecimale (i bit veri e propri).

3. **Fermare e salvare:**
   Per fermare la cattura dei dati, clicca sul **quadrato rosso** (Stop) in alto a sinistra. Puoi salvare la cattura andando su `File > Save As...` (il formato standard è `.pcapng`).

### Il significato dei colori
Wireshark colora i pacchetti per aiutarti a identificarli velocemente:
- **Verde scuro:** Traffico HTTP/Routing.
- **Verde chiaro:** Traffico TCP generico.
- **Azzurro:** Traffico UDP (es. DNS).
- **Nero con testo rosso:** Pacchetti con errori (es. TCP Retransmission o pacchetti persi).

---

## Parte 2: Guida Avanzata e Dettagliata

Una volta acquisita familiarità con l'interfaccia base, Wireshark offre strumenti potentissimi per l'analisi approfondita.

### 1. Filtri di Cattura vs Filtri di Visualizzazione
È fondamentale capire la differenza tra questi due:

*   **Filtri di Cattura (Capture Filters):** Si impostano *prima* di avviare la cattura. Dicono a Wireshark di registrare *solo* un certo tipo di traffico, ignorando il resto (utile per file pcap leggeri). Usano la sintassi BPF (Berkeley Packet Filter).
    *   *Esempio:* `tcp port 80` (Cattura solo traffico web non criptato).
    *   *Esempio:* `host 192.168.1.1` (Cattura solo traffico da o verso questo IP).

*   **Filtri di Visualizzazione (Display Filters):** Si usano nella barra verde in alto *dopo* o *durante* la cattura. Nascondono i pacchetti che non ti interessano, ma i dati rimangono nel file salvato.
    *   `ip.addr == 192.168.1.5` (Mostra traffico di questo specifico IP).
    *   `tcp.port == 443` (Mostra traffico HTTPS).
    *   `http.request.method == "GET"` (Mostra solo le richieste GET HTTP).
    *   `dns or icmp` (Mostra traffico DNS o Ping).

### 2. Follow Stream (Seguire il Flusso)
Questa è una delle funzioni più utili per capire cosa si stanno dicendo due dispositivi. 
Se trovi un pacchetto interessante (es. HTTP o TCP), fai clic destro su di esso e seleziona **Follow > TCP Stream** (o HTTP/UDP Stream).
Wireshark aprirà una nuova finestra ricostruendo l'intera conversazione scartando intestazioni e mostrando solo i dati dell'applicazione. Testo in rosso è inviato dal client, in blu dal server. (Molto utile per leggere credenziali in chiaro!).

### 3. Analisi e Statistiche
Il menu **Statistics** in alto è una miniera d'oro per le indagini di cybersecurity:
- **Protocol Hierarchy:** Mostra un albero di tutti i protocolli catturati e le loro percentuali. Ideale per farsi un'idea generale (es. "Perché c'è un 30% di traffico BitTorrent?").
- **Conversations / Endpoints:** Mostra chi sta parlando con chi, la quantità di byte scambiati e gli indirizzi IP/MAC coinvolti. Perfetto per individuare i dispositivi più attivi (top talkers) o connessioni sospette.
- **I/O Graphs:** Genera grafici dell'andamento del traffico nel tempo. Utile per visualizzare picchi anomali o attacchi DoS/DDoS.

### 4. Esportare Oggetti (Extracting Objects)
Se qualcuno ha scaricato un file (es. un'immagine, un PDF o persino un malware) in chiaro (HTTP, FTP, SMB), puoi estrarlo direttamente dal traffico catturato!
- Vai su `File > Export Objects > HTTP...` (o il protocollo desiderato).
- Wireshark mostrerà tutti i file trasferiti. Puoi selezionarli e salvarli sul tuo computer per analizzarli.

### 5. Decriptare traffico SSL/TLS
Oggi quasi tutto il traffico web è criptato (HTTPS). Wireshark non può leggere il traffico cifrato a meno che non abbia le chiavi.
In ambienti di test o se hai il controllo del client, puoi forzare il browser a salvare le chiavi di sessione:
1. Imposta la variabile d'ambiente sul PC (es. Windows): `SSLKEYLOGFILE = C:\keys\ssl.log`.
2. Apri il browser, naviga e chiudilo.
3. In Wireshark, vai su `Edit > Preferences > Protocols > TLS`.
4. Nel campo *(Pre)-Master-Secret log filename*, carica il file `ssl.log`.
Magicamente, Wireshark decripterà i pacchetti HTTPS rendendo leggibili i dati sottostanti!

### 6. Rilevamento Anomalie (Cybersecurity)
Cosa cercare quando si fa Threat Hunting con Wireshark:
- **Scansioni di porte (Port Scanning):** Un alto numero di pacchetti TCP SYN verso porte diverse di un singolo host in brevissimo tempo. (Filtro utile: `tcp.flags.syn==1 and tcp.flags.ack==0`).
- **Traffico anomalo su porte non standard:** Es. connessioni SSH (porta 22) che viaggiano sulla porta 80 o 443 per bypassare i firewall.
- **Traffico DNS anomalo:** Il DNS Tunneling usato dai malware per esfiltrare dati. Cerca query DNS eccessivamente lunghe o frequenti.
- **ARP Spoofing:** Cerca numerosi messaggi gratuiti ARP nel traffico (`arp.duplicate-address-detected` e simili filtri diagnostici di Wireshark).

### Conclusione
Wireshark analizza "ciò che viaggia sul filo", il che significa che i pacchetti non mentono mai. Padroneggiare i filtri di visualizzazione e capire intimamente l'handshake TCP o le query DNS trasformerà le informazioni caotiche di rete in chiare prove di diagnostica o analisi forense.
