# Manuale Tecnico Avanzato: Analisi di Rete e Protocol Analysis con Wireshark

Questo documento costituisce una guida esaustiva, tecnica e professionale all'uso di Wireshark. È stato redatto con l'obiettivo di supportare attività di Network Engineering, Protocol Analysis, Digital Forensics e Incident Response (DFIR) per la cybersecurity.

---

## 1. Architettura e Motore di Cattura

Wireshark non è un'unica applicazione monolitica, ma un ecosistema basato su librerie specializzate per l'intercettazione e la dissezione dei pacchetti.

*   **Librerie di cattura (libpcap/Npcap):** Su Unix/Linux il motore si basa su `libpcap`, mentre su Windows (a partire dalle versioni recenti) utilizza `Npcap` (sostituto del deprecato WinPcap). Queste librerie permettono alla scheda di rete di bypassare lo stack di rete del sistema operativo e catturare i frame Ethernet grezzi.
*   **Dumpcap:** È il motore CLI sottostante a Wireshark responsabile *esclusivamente* della cattura dei pacchetti. È progettato per consumare pochissima RAM e CPU. Nelle catture massive e prolungate (es. analisi continua di un link 10Gbps), si deve utilizzare Dumpcap da terminale per evitare il crash per "Out of Memory" tipico della GUI di Wireshark.
*   **Dissectors:** Moduli scritti in C o Lua (più di 3000 integrati) che traducono la sequenza grezza di byte in campi logici comprensibili, basandosi sulle specifiche RFC dei protocolli.

### Promiscuous Mode vs Monitor Mode
*   **Promiscuous Mode (Ethernet/Wi-Fi):** Obbliga la NIC (Network Interface Card) a passare al sistema operativo *tutti* i frame che transitano sul segmento di rete, non solo quelli destinati al suo indirizzo MAC. L'efficacia in reti moderne è limitata dagli switch, che isolano i domini di collisione (richiede quindi funzionalità di *Port Mirroring* / *SPAN* sullo switch).
*   **Monitor Mode (Solo Wi-Fi):** A differenza della modalità promiscua, permette di catturare anche il traffico di gestione (management frames come Beacon, Probe Request) e controllo (RTS/CTS), anche di reti a cui non si è associati (fondamentale per penetration testing wireless, es. suite Aircrack-ng).

---

## 2. Filtri: BPF (Capture) vs Display Filters

Una padronanza assoluta dei filtri è il discrimine tra un analista amatoriale e un professionista.

### 2.1 Capture Filters (Sintassi BPF)
I filtri di cattura vengono compilati in bytecode BPF (Berkeley Packet Filter) ed eseguiti a livello di kernel. Sono estremamente efficienti ma limitati nella sintassi. Riducono la quantità di dati scritti sul disco (file PCAP).

**Primitivi:** `host`, `net`, `port`, `portrange`, `src`, `dst`.
**Operatori:** `and` (`&&`), `or` (`||`), `not` (`!`).

**Esempi avanzati BPF:**
*   Catturare solo traffico IPv4 ignorando ARP e IPv6:
    `ip`
*   Escludere traffico di broadcast e multicast:
    `not broadcast and not multicast`
*   **Bit-masking (Il vero potere del BPF):** Estrarre pacchetti in base a specifici bit di un header. L'header TCP inizia all'offset 14 (Ethernet) + 20 (IP) = 34, ma nel filtro TCP lo si calcola a partire dall'inizio dell'header TCP. I flag TCP sono al byte 13 dell'header TCP.
    *   *Catturare solo pacchetti con flag TCP SYN (Port Scanning/Handshake):*
        `tcp[tcpflags] & (tcp-syn) != 0` oppure `tcp[13] & 2 != 0`
    *   *Catturare solo flag RST (Reset - anomalie o blocchi firewall):*
        `tcp[tcpflags] & (tcp-rst) != 0`

### 2.2 Display Filters (Filtri di Visualizzazione)
Agiscono post-cattura per scremare l'interfaccia. Supportano l'intera gamma di dissectors di Wireshark.

**Operatori Relazionali e Logici:** `==` (eq), `!=` (ne), `>` (gt), `<` (lt), `>=` (ge), `<=` (le), `&&` (and), `||` (or), `!` (not).
**Operatori di Stringa:** `contains` (substring), `matches` (Espressioni Regolari PCRE).

**Esempi Avanzati:**
*   Ricerca di malware tramite User-Agent HTTP sospetti:
    `http.user_agent matches "(?i)(curl|python|wget|nmap)"`
*   Rilevare esfiltrazione DNS (Tunneling DNS) cercando query esageratamente lunghe:
    `dns.qry.name.len > 50`
*   Trovare traffico TLS obsoleto o debole (TLS 1.0/1.1):
    `ssl.record.version == 0x0301 or ssl.record.version == 0x0302`
*   Slice Operator (estrazione byte esatti): Per cercare l'indirizzo MAC `00:11:22:33:44:55` all'interno del payload:
    `frame[0:6] == 00:11:22:33:44:55`

---

## 3. TCP/IP Protocol Analysis e Troubleshooting

Per la risoluzione di problemi applicativi o di rete, l'analista deve interpretare le "Expert Information" di Wireshark riguardo a TCP.

### 3.1 Sequenze e Riconoscimenti (SEQ/ACK)
Wireshark calcola i numeri di sequenza relativi (partendo da 0 anziché dai numeri a 32-bit grezzi casuali stabiliti nell'handshake) per facilitare la lettura.

*   **TCP Retransmission:** Il mittente non ha ricevuto un ACK dal destinatario per un segmento inviato entro il timeout calcolato (RTO - Retransmission Timeout) e lo reinvia. Sintomo di packet loss pesante (congestione, cavi danneggiati, drop del firewall).
*   **TCP Fast Retransmission:** Ricezione di 3 "Duplicate ACK". Il mittente reinvia il pacchetto perso prima che scada l'RTO. Meccanismo di recupero efficiente.
*   **TCP Previous segment not captured:** C'è un salto nei numeri di sequenza in arrivo. Il pacchetto è stato perso *prima* di arrivare all'interfaccia di sniffing.
*   **TCP Out-of-Order:** Un pacchetto è arrivato, ma ha un numero di sequenza precedente a quello che ci si aspetta. Tipico di reti con percorsi asimmetrici o bilanciatori di carico.
*   **TCP ZeroWindow:** Un host segnala che il suo buffer di ricezione TCP è pieno e non può ricevere ulteriori dati (Window Size = 0). Sintomo che l'applicazione (es. un server web) è satura o bloccata, non un problema di rete fisica.

### 3.2 Analisi Grafica (TCP Stream Graphs)
In `Statistics > TCP Stream Graphs`:
*   **Stevens / tcptrace (Time-Sequence Graph):** Grafici fondamentali per visualizzare il throughput, i segmenti inviati nel tempo, e identificare visivamente ritrasmissioni e colli di bottiglia causati dalla Window Size.
*   **Round Trip Time (RTT):** Grafico vitale per misurare la latenza reale della rete valutando il delta di tempo tra l'invio di un pacchetto di dati e il relativo ACK.

---

## 4. Analisi Cybersecurity e Threat Hunting (DFIR)

Wireshark è lo strumento principe nell'Incident Response per individuare Indicatori di Compromissione (IoC) a livello di rete.

### 4.1 Rilevamento Network Scanning e Reconnaissance
*   **TCP SYN Scan (Stealth Scan):** Attaccante (es. Nmap) invia un SYN. Se la porta è aperta, la vittima risponde con SYN/ACK. L'attaccante chiude con RST (non completa l'handshake per evitare log applicativi).
    *   *Visibilità in Wireshark:* Altissimo numero di pacchetti `TCP SYN` originati da un singolo IP verso porte sequenziali o casuali di un target in pochissimi secondi.
*   **TCP XMAS Scan:** Pacchetti con flag FIN, PSH, e URG accesi contemporaneamente. Tecnica obsoleta, ma palese indicatore di scansionamento. Filtro: `tcp.flags == 0x29`.
*   **UDP Scan / ICMP Error Analysis:** Le scansioni UDP generano traffico di ritorno di tipo "ICMP Destination Unreachable (Port Unreachable)" se la porta è chiusa. Filtro: `icmp.type == 3 and icmp.code == 3`.

### 4.2 ARP Spoofing e Man-in-the-Middle (MitM)
L'ARP spoofing si verifica quando un attaccante inonda la rete locale di messaggi "ARP Reply" non richiesti (Gratuitous ARP), associando il proprio MAC address all'IP del Default Gateway (o della vittima).
*   **Sintomo in Wireshark:** Messaggi di allerta Expert *"Duplicate IP address configured"*.
*   **Filtro diagnostico:** `arp.duplicate-address-detected` o la ricerca manuale di indirizzi IP associati a MAC multipli all'interno della medesima sessione di sniffing.

### 4.3 Estrazione di Malware ed Esfiltrazione Dati
Se il traffico non è cifrato (HTTP, SMB, FTP, SMTP in chiaro), Wireshark può ricostruire i file trasferiti.
*   `File > Export Objects > HTTP (o SMB, ecc.)`.
*   Qui è possibile estrarre payload malevoli (es. eseguibili `.exe` o script `.ps1` mascherati da immagini) scaricati da dropper o in fase di movimento laterale via SMB (es. EternalBlue).
*   **Esfiltrazione DNS:** Se un malware invia dati sensibili mascherati da query DNS (es. `base64_dati_rubati.c2.attaccante.com`), usare `Statistics > DNS` per individuare alti volumi di interrogazioni verso domini specifici o query TXT anomale.

---

## 5. Decifratura Traffico (TLS/SSL/802.11)

L'analisi forense odierna sbatte quasi sempre contro il muro della crittografia TLS. Wireshark offre vari metodi per la decifrazione (Decryption), a patto di disporre del materiale crittografico (Keys).

### 5.1 TLS/HTTPS (SSLKEYLOGFILE)
Con l'avvento della Perfect Forward Secrecy (PFS - Diffie-Hellman Ephemeral) in TLS 1.2 e 1.3, avere la chiave privata RSA del server *non è più sufficiente* per decifrare il traffico. È necessario il "Pre-Master Secret".
*   In ambienti di test o malware lab, si imposta a livello OS (Windows/Linux/Mac) la variabile ambiente `SSLKEYLOGFILE=/path/to/sslkeys.log`. Browser come Chrome, Edge e Firefox scriveranno lì le chiavi simmetriche di sessione in tempo reale.
*   In Wireshark: `Edit > Preferences > Protocols > TLS > (Pre)-Master-Secret log filename`.
*   *Risultato:* Si abiliteranno tab come "Decrypted TLS" e la dissezione HTTP/2 all'interno dello stream crittografato.

### 5.2 Traffico Wireless 802.11 (WPA/WPA2-PSK)
Per leggere pacchetti IP su una rete Wi-Fi cifrata con WPA-Personal:
*   In Wireshark: `Edit > Preferences > Protocols > IEEE 802.11`.
*   Spuntare "Enable decryption" e inserire la chiave WPA come `wpa-pwd:PasswordRete:SSIDRete`.
*   *Condizione critica:* Wireshark *deve* aver catturato l'intero "EAPOL 4-Way Handshake" del client in fase di connessione, altrimenti la decifratura è matematicamente impossibile in quanto manca il materiale per la generazione della PTK (Pairwise Transient Key).

---

## 6. CLI, Automazione e Scripting Avanzato

L'interfaccia grafica è ideale per l'analisi spot. Per dataset giganti, automazione SOC o Data Science, entrano in gioco CLI e script.

### 6.1 TShark (Wireshark CLI)
TShark espone tutta la potenza dei dissector di Wireshark direttamente da terminale. Ideale per pipeline bash, SIEM o script Python.

**Estrazione dati specifici in formato CSV (es. per analisi Machine Learning):**
```bash
tshark -r cattura.pcap -Y "http.request.method == GET" -T fields -e frame.time -e ip.src -e ip.dst -e http.host -e http.request.uri -E header=y -E separator=, -E quote=d > risultati.csv
```
Questo comando legge un file, applica un Display Filter (`-Y`), estrae solo specifici campi di interesse (`-T fields -e <campo>`) e formatta l'output come CSV.

**Creazione rapida di statistiche endpoints:**
```bash
tshark -r malware_traffic.pcap -q -z endpoints,ip
```

### 6.2 Estensione con Dissectors in Lua
Quando si lavora con protocolli proprietari, IoT (es. un protocollo SCADA non documentato o una telemetria custom), è possibile scrivere un dissector personalizzato in Lua senza dover ricompilare l'intero codice C di Wireshark.

*Esempio scheletro Dissector Lua:*
```lua
-- Definizione del nuovo protocollo
local my_proto = Proto("MyProto", "Mio Protocollo Custom IoT")

-- Definizione dei campi
local f_id = ProtoField.uint16("myproto.id", "Device ID", base.HEX)
local f_temp = ProtoField.uint8("myproto.temp", "Temperature", base.DEC)
my_proto.fields = { f_id, f_temp }

-- Funzione di dissezione
function my_proto.dissector(buffer, pinfo, tree)
    -- Assegnazione del nome alla colonna "Protocol"
    pinfo.cols.protocol = my_proto.name
    
    -- Creazione del nodo nell'albero dei dettagli pacchetto
    local subtree = tree:add(my_proto, buffer(), "MyProto Payload")
    
    -- Estrazione dei campi dal buffer raw
    subtree:add(f_id, buffer(0,2))
    subtree:add(f_temp, buffer(2,1))
end

-- Associazione del protocollo a una porta (es. UDP 7777)
local udp_table = DissectorTable.get("udp.port")
udp_table:add(7777, my_proto)
```
Questo script, salvato e caricato nelle impostazioni di Wireshark (o nella cartella plugin), dissezionerà in tempo reale traffico UDP custom, creando campi filtrabili nativamente (es. `myproto.temp > 30`).

---

## 7. Metodologia del Professionista (Checklist d'Analisi)

1. **Statistiche Iniziali:** Mai buttarsi nei pacchetti a testa bassa. Partire da `Statistics > Protocol Hierarchy` e `Statistics > Endpoints` per definire la baseline e capire la composizione del PCAP.
2. **Controllo degli Errori (Expert Infos):** Cliccare il cerchio in basso a sinistra nell'UI (Expert Information). Errori severi o warning sono raggruppati qui e velocizzano l'individuazione di drop TCP, anomalie di routing o pacchetti malformati (indice di fuzzer, exploit o hardware difettoso).
3. **Filter-Out del Rumore:** Escludere traffico noto e innocuo (es. `!(ip.addr == mio_ip_gestione) and !(arp or mdns)`) per focalizzare l'attenzione sull'anomalia.
4. **Follow Stream e Decrypt:** Ricomporre le conversazioni per validare la presenza di attacchi o malfunzionamenti a livello 7 (Application Layer).
5. **Reportistica:** Usare i grafici di I/O (I/O Graphs) per correlare log SIEM o allarmi IPS con l'effettivo picco di traffico catturato nel PCAP.
