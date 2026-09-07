<!-- Intestazione aziendale -->

![Logo azienda](../assets/logo-azienda.png)

**ZetaByteNexus** — {{NOME_CEDENTE}}  
{{INDIRIZZO_CEDENTE}}  
P.IVA / CF: {{PIVA_CEDENTE}}  
Email: {{EMAIL_CEDENTE}} — Tel: {{TEL_CEDENTE}}

---

# PROMEMORIA FATTURA — {{NUMERO_FATTURA}}

> ⚠️ **Documento di cortesia / promemoria interno — non è una fattura fiscalmente valida.**  
> La fattura elettronica va emessa tramite software SDI (es. Fatture in Cloud, Aruba).  
> Questo file serve come traccia dati per l'emissione.

| | |
|---|---|
| **Data emissione** | {{DATA_EMISSIONE}} |
| **Tipo documento** | {{TIPO_DOCUMENTO}} |
| **Preventivo di riferimento** | {{RIF_PREVENTIVO}} |

**Cedente:** {{NOME_CEDENTE}}  
**Cessionario:** {{RAGIONE_SOCIALE_CLIENTE}} — {{NOME_CLIENTE}}

---

## Dettaglio

| # | Descrizione | Imponibile | IVA | Totale |
|---|-------------|-----------:|----:|-------:|
| 1 | {{DESCRIZIONE_RIGA}} | {{IMPORTO_NETTO}} | {{IVA}} | {{TOTALE_RIGA}} |
| | **Totale fattura** | | | **{{TOTALE_FATTURA}}** |

{{REGIME_FISCALE_NOTA}}
**Bollo:** {{BOLLO}} (da assolvere su fattura elettronica se importo > 77,47 €)
**Da verificare con commercialista:** {{VERIFICHE_FISCALI}}

---

_Fattura emessa da ZetaByteNexus_
