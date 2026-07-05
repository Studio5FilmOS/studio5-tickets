const SECRET_TOKEN_GAS = "Studio5Tickets2025"; 
const LOGO_STUDIO5 = "https://i.imgur.com/0z5756T.png"; 

function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter.page == 'admin') return HtmlService.createTemplateFromFile('registro_manual').evaluate().setTitle('Admin Studio 5').addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    else if (e.parameter.page == 'scan') return HtmlService.createTemplateFromFile('scanner').evaluate().setTitle('Escáner Studio 5').addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    else if (e.parameter.t) {
      let template = HtmlService.createTemplateFromFile('boleto'); template.ticketId = e.parameter.t;
      try { let datos = getTicketData(e.parameter.t); if (datos.error) template.error = datos.error; else { template.error = ""; template.nombre = datos.nombre; template.fecha = datos.fecha ? String(datos.fecha).replace(/'/g, '') : ""; template.cantidad = datos.cantidad; template.desglose = datos.desglose; template.lugar = datos.lugar; template.afiche = datos.evento ? (datos.evento.imagen || LOGO_STUDIO5) : LOGO_STUDIO5; template.tipoVenta = (datos.status === "Cortesía") ? "Cortesia" : "Venta"; } } catch(err) { template.error = "Error al procesar el boleto."; }
      return template.evaluate().setTitle('E-Ticket | Studio 5').addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }
  return HtmlService.createTemplateFromFile('index').evaluate().setTitle('Cartelera Studio 5').addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

function corregirLinkImgur(url) { let link = String(url || "").trim(); if (link.match(/^https?:\/\/imgur\.com\/[a-zA-Z0-9]+$/)) { link = `https://i.imgur.com/${link.split('/').pop()}.jpg`; } return link; }

function getTicketData(ticketId) {
  try {
    const sheetReg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registros");
    const dataR = sheetReg.getDataRange().getValues();
    let idEvento = ""; let ticketData = null;
    for (let i = 1; i < dataR.length; i++) {
      if (!dataR[i]) continue;
      if (String(dataR[i][4] || "").trim() === String(ticketId).trim()) {
        ticketData = { nombre: String(dataR[i][1] || ""), status: String(dataR[i][5] || ""), fecha: String(dataR[i][7] || ""), cantidad: String(dataR[i][8] || ""), desglose: String(dataR[i][10] || ""), lugar: String(dataR[i][17] || "") };
        idEvento = String(dataR[i][15] || ""); break;
      }
    }
    if(!ticketData) return { error: "Boleto no encontrado." };
    const eventos = getTodosLosEventos(); ticketData.evento = eventos.find(e => String(e.id) === idEvento) || null;
    return ticketData;
  } catch (err) { return { error: err.message }; }
}

function asegurarHojaEventos() {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Eventos");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Eventos");
    sheet.appendRow(["ID_Evento", "Nombre_Evento", "Imagen_URL", "Precio_General", "Precio_Promo", "Aforo_Total", "Estado", "Tipo_Promo", "Fechas_Funciones", "Plantilla_Boleto", "Precio_Nino", "Lugar", "Fecha_Limite_Promo", "Tarifa_Unica"]);
  }
  return sheet;
}

function guardarEventoDesdeWeb(data) {
  try {
    const sheet = asegurarHojaEventos();
    data.imagen = corregirLinkImgur(data.imagen); data.plantilla = corregirLinkImgur(data.plantilla);
    const pNino = parseFloat(data.precioNino) || 0; const pPromo = parseFloat(data.precioPromo) || 0;
    
    if (data.idEvento) { 
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.idEvento)) {
          sheet.getRange(i + 1, 2, 1, 13).setValues([[ data.nombre, data.imagen, data.precioGeneral, pPromo, data.aforo, data.estado, data.tipoPromo, data.fechas, data.plantilla, pNino, data.lugar, data.fechaLimitePromo, data.tarifaUnica ]]);
          return { status: "OK", message: "Evento actualizado." };
        }
      }
    } else { 
      sheet.appendRow([ "EVT-" + Math.floor(Math.random() * 10000), data.nombre, data.imagen, data.precioGeneral, pPromo, data.aforo, data.estado, data.tipoPromo, data.fechas, data.plantilla, pNino, data.lugar, data.fechaLimitePromo, data.tarifaUnica ]);
      return { status: "OK", message: "Evento publicado." };
    }
  } catch (e) { return { status: "ERROR", message: e.message }; }
}

function alternarEstadoEvento(idEvento, estadoActual) {
  try {
    const sheet = asegurarHojaEventos(); const rows = sheet.getDataRange().getValues();
    const nuevoEstado = (estadoActual === "Activo") ? "Inactivo" : "Activo";
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(idEvento)) { sheet.getRange(i + 1, 7).setValue(nuevoEstado); return { status: "OK", nuevoEstado: nuevoEstado }; }
    }
  } catch (e) { return { status: "ERROR", message: e.message }; }
}

function isEventoVencido(fechasStr) {
    if (!fechasStr || fechasStr === "undefined") return false;
    const meses = { "enero":0, "febrero":1, "marzo":2, "abril":3, "mayo":4, "junio":5, "julio":6, "agosto":7, "septiembre":8, "octubre":9, "noviembre":10, "diciembre":11 };
    let maxDate = new Date(2000, 0, 1); let foundValidDate = false; const hoy = new Date();
    fechasStr.toLowerCase().split(',').forEach(f => {
        let match = f.match(/(\d+)\s*(?:de\s*)?([a-z]+)/);
        if (match && meses[match[2]] !== undefined) {
            let dObj = new Date(hoy.getFullYear(), meses[match[2]], parseInt(match[1]), 23, 59, 59);
            if (dObj > maxDate) maxDate = dObj; foundValidDate = true;
        }
    });
    return foundValidDate ? (hoy.getTime() > maxDate.getTime()) : false; 
}

function getTodosLosEventos() {
  try {
      const sheetE = asegurarHojaEventos();
      const dataE = sheetE.getDataRange().getValues();
      const sheetReg = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registros");
      const dataR = sheetReg ? sheetReg.getDataRange().getValues() : [];

      let ventasPorEventoFecha = {};
      for (let i = 1; i < dataR.length; i++) {
         if (!dataR[i] || String(dataR[i][0] || "").trim() === "") continue;
         if (String(dataR[i][5] || "") !== "Anulado") {
            let clave = String(dataR[i][15] || "") + "|" + String(dataR[i][7] || "").replace(/'/g, '').trim();
            ventasPorEventoFecha[clave] = (ventasPorEventoFecha[clave] || 0) + (parseInt(dataR[i][8]) || 0);
         }
      }

      let eventos = [];
      for (let i = 1; i < dataE.length; i++) {
        if (!dataE[i]) continue;
        let idEvt = String(dataE[i][0] || "").trim(); 
        if (!idEvt || idEvt === "ID_Evento" || idEvt === "undefined") continue;

        let aforoTotal = parseInt(dataE[i][5]) || 0; 
        let fechasStr = String(dataE[i][8] || "");
        let fechasArr = fechasStr.split(',');
        let disponiblesPorFecha = {};
        
        fechasArr.forEach(f => { 
            let fLimpia = f.trim(); 
            if(fLimpia && fLimpia !== "undefined") disponiblesPorFecha[fLimpia] = aforoTotal - (ventasPorEventoFecha[idEvt + "|" + fLimpia] || 0); 
        });

        eventos.push({ 
          id: idEvt, nombre: String(dataE[i][1] || ""), imagen: corregirLinkImgur(dataE[i][2]), 
          precioGeneral: parseFloat(dataE[i][3])||0, precioPromo: parseFloat(dataE[i][4])||0, 
          precioNino: parseFloat(dataE[i][10])||0, aforo: aforoTotal, aforoPorFecha: disponiblesPorFecha, 
          estado: String(dataE[i][6] || ""), tipoPromo: String(dataE[i][7] || "Ninguna"), fechas: fechasStr, 
          plantilla: corregirLinkImgur(dataE[i][9]), lugar: String(dataE[i][11] || "Por definir"),
          fechaLimitePromo: String(dataE[i][12] || ""), tarifaUnica: String(dataE[i][13] || "NO"), vencido: isEventoVencido(fechasStr) 
        });
      }
      return eventos;
  } catch (e) {
      throw new Error("Error interno del servidor: " + e.message);
  }
}

function enviarEmailCliente(data) {
  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.TicketID)}&color=000000&bgcolor=ffffff`;
    const cortesiaTag = data.Tipo === "Cortesía" ? `<div style="background-color: #e50914; color: white; display: inline-block; padding: 5px 15px; font-weight: bold; font-size: 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 15px;">Cortesía</div>` : '';
    const htmlBody = `<div style="background-color: #050505; padding: 40px 20px; text-align: center; font-family: sans-serif;"><h2 style="color: #F1A51C; margin-bottom: 20px;">¡Aquí tienes tu acceso, ${data.Nombre}!</h2><div style="background-color: #1a1a1a; padding: 25px; border-radius: 16px; max-width: 400px; margin: 0 auto; border: 1px solid #333;">${cortesiaTag}<img src="${data.Evento.imagen}" style="width: 100%; height: auto; object-fit: cover; border-radius: 8px;"><h3 style="color: #fff; margin-top: 20px; text-transform: uppercase;">${data.Evento.nombre}</h3><p style="color: #aaa; font-size: 16px;">Fecha: <b>${data.FechaFuncion}</b><br>Entradas: <b>${data.Cantidad}</b> <span style="font-size: 13px; color: #888;">(${data.Desglose})</span></p><p style="color: #F1A51C; font-weight: bold;">📍 LUGAR: ${data.Evento.lugar}</p><img src="${qrApiUrl}" style="width: 200px; height: 200px; margin-top: 15px; border: 10px solid white; border-radius: 12px;"><p style="color: #F1A51C; font-weight: bold; margin-top: 15px; font-size: 18px; letter-spacing: 1px;">${data.TicketID}</p></div></div>`;
    GmailApp.sendEmail(data.Email, `Tus entradas para ${data.Evento.nombre}`, "", { htmlBody: htmlBody, name: "Studio 5 Film & Art" });
  } catch (e) { Logger.log(e.message); }
}

function registrarVentaPOS(formData) {
  try {
    const ticketId = "TKT-" + new Date().getTime();
    const eventoActual = getTodosLosEventos().find(e => e.id === formData.idEvento);
    const cAd = parseInt(formData.cantAdultos, 10) || 0; const cNi = parseInt(formData.cantNinos, 10) || 0;
    const cantidadTotal = cAd + cNi;
    
    let promoActiva = false;
    if (eventoActual.tipoPromo !== "Ninguna") {
        if (!eventoActual.fechaLimitePromo) promoActiva = true;
        else if (new Date() <= new Date(eventoActual.fechaLimitePromo + "T23:59:59")) promoActiva = true;
    }

    let precioNeto = 0;
    if (promoActiva && eventoActual.tipoPromo === "2x1") {
       precioNeto = ((Math.floor(cAd / 2) * eventoActual.precioGeneral) + ((cAd % 2) * eventoActual.precioGeneral)) + (cNi * eventoActual.precioNino);
    } else if (promoActiva && eventoActual.tipoPromo === "Preventa") {
       precioNeto = (cAd * eventoActual.precioPromo) + (cNi * eventoActual.precioNino);
    } else {
       precioNeto = (cAd * eventoActual.precioGeneral) + (cNi * eventoActual.precioNino);
    }

    let precioFinal = formData.tipoVenta === "Cortesia" ? 0 : precioNeto;
    let status = formData.tipoVenta === "Cortesia" ? "Cortesía" : (formData.tipoVenta === "Pendiente" ? "Pendiente" : "Pagado");
    let desglose = (eventoActual.tarifaUnica === "SI") ? `${cAd} Entradas` : `${cAd} Ad / ${cNi} Ni`;
    let ws = String(formData.whatsapp || "").replace(/\D/g,'');

    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Registros").appendRow([ 
      new Date(), formData.nombre, formData.email, ws, ticketId, status, "", `'${formData.fecha}`, cantidadTotal, precioFinal, desglose, formData.metodoPago, precioFinal, "", 0, formData.idEvento, eventoActual.nombre, eventoActual.lugar        
    ]);
    
    if(status !== "Pendiente" && formData.email && formData.email.includes("@")) {
       enviarEmailCliente({ Email: formData.email, Nombre: formData.nombre, TicketID: ticketId, FechaFuncion: formData.fecha, Cantidad: cantidadTotal, Desglose: desglose, Evento: eventoActual, Tipo: status });
    }

    return { status: "OK", ticketId: ticketId, precio: precioFinal.toFixed(2), evento: eventoActual, fecha: formData.fecha, nombre: formData.nombre, cantidad: cantidadTotal, desglose: desglose, whatsapp: ws, scriptUrl: ScriptApp.getService().getUrl(), tipo: formData.tipoVenta };
  } catch (e) { return { status: "ERROR", message: e.message }; }
}