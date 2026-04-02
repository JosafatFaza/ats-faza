export const SITE_HOSTNAME = "grupofazamx.sharepoint.com";
export const SITE_PATH = "/sites/PortalGrupoFaza";
export const SITE_ID = `${SITE_HOSTNAME}:${SITE_PATH}:`;

export const LISTS = {
  vacantes:      "d23b693f-f397-4acf-8889-a71d17c469a4",
  candidatos:    "8968f5f4-eaae-425c-98b3-4201d550c430",
  etapas:        "09277d31-caf9-47cd-8e63-caca56f6a7d1",
  requisiciones: "abd91e51-5a38-44f3-9318-274179873aa2",
  entrevistas:   "90863e4b-b09f-42cf-89b9-1557025cdb8c",
  roles:         "d278cf7f-18ed-40d2-9912-4c4c65942f0c",
};

export const BASE = `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists`;

export const endpoints = {
  vacantes:      `${BASE}/${LISTS.vacantes}/items`,
  candidatos:    `${BASE}/${LISTS.candidatos}/items`,
  etapas:        `${BASE}/${LISTS.etapas}/items`,
  requisiciones: `${BASE}/${LISTS.requisiciones}/items`,
  entrevistas:   `${BASE}/${LISTS.entrevistas}/items`,
  roles:         `${BASE}/${LISTS.roles}/items`,
};
