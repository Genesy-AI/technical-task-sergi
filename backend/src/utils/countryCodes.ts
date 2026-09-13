export const SUPPORTED_COUNTRY_CODES = new Set<string>(
  'AC,AD,AE,AF,AG,AI,AL,AM,AN,AO,AP,AQ,AR,AS,AT,AU,AW,AX,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BL,BM,BN,BO,BQ,BR,BS,BT,BU,BV,BW,BX,BY,BZ,CA,CC,CD,CF,CG,CH,CI,CK,CL,CM,CN,CO,CP,CQ,CR,CS,CU,CV,CW,CX,CY,CZ,DE,DG,DJ,DK,DM,DO,DY,DZ,EA,EC,EE,EF,EG,EH,EM,EP,ER,ES,ET,EU,EV,EW,EZ,FI,FJ,FK,FL,FM,FO,FR,FX,GA,GB,GC,GD,GE,GF,GG,GH,GI,GL,GM,GN,GP,GQ,GR,GS,GT,GU,GW,GY,HK,HM,HN,HR,HT,HU,IB,IC,ID,IE,IL,IM,IN,IO,IQ,IR,IS,IT,JA,JE,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KY,KZ,LA,LB,LC,LF,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MF,MG,MH,MK,ML,MM,MN,MO,MP,MQ,MR,MS,MT,MU,MV,MW,MX,MY,MZ,NA,NC,NE,NF,NG,NI,NL,NO,NP,NR,NT,NU,NZ,OA,OM,PA,PE,PF,PG,PH,PI,PK,PL,PM,PN,PR,PS,PT,PW,PY,QA,RA,RB,RC,RE,RH,RI,RL,RM,RN,RO,RP,RS,RU,RW,SA,SB,SC,SD,SE,SF,SG,SH,SI,SJ,SK,SL,SM,SN,SO,SR,SS,ST,SU,SV,SX,SY,SZ,TA,TC,TD,TF,TG,TH,TJ,TK,TL,TM,TN,TO,TP,TR,TT,TV,TW,TZ,UA,UG,UK,UM,UN,US,UY,UZ,VA,VC,VE,VG,VI,VN,VU,WF,WG,WL,WO,WS,WV,YE,YT,YU,YV,ZA,ZM,ZR,ZW'.split(
    ','
  )
)

export const validateCountryCode = (
  countryCode: unknown
): { countryCode: string; isUnsupported: boolean } => {
  if (countryCode === undefined || countryCode === null) {
    return { countryCode: '', isUnsupported: false }
  }

  if (typeof countryCode !== 'string') {
    return { countryCode: '', isUnsupported: true }
  }

  const trimmedCountryCode = countryCode.trim()
  if (!trimmedCountryCode) {
    return { countryCode: '', isUnsupported: false }
  }

  return {
    countryCode: SUPPORTED_COUNTRY_CODES.has(trimmedCountryCode) ? trimmedCountryCode : '',
    isUnsupported: !SUPPORTED_COUNTRY_CODES.has(trimmedCountryCode),
  }
}
