export const msalConfig = {
  auth: {
    clientId: 'ed91b126-92f8-4370-a6d3-bda7d60e13f1',
    authority: 'https://login.microsoftonline.com/b16dca4b-9062-4259-a5cd-2f8b4a3eafe2',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Sites.ReadWrite.All', 'Calendars.ReadWrite', 'Mail.Send'],
};

export const SITE_BASE =
  'https://graph.microsoft.com/v1.0/sites/grupofazamx.sharepoint.com:/sites/PortalGrupoFaza:';

export const LISTS = {
  vacantes:      'd23b693f-f397-4acf-8889-a71d17c469a4',
  candidatos:    '8968f5f4-eaae-425c-98b3-4201d550c430',
  etapas:        '09277d31-caf9-47cd-8e63-caca56f6a7d1',
  requisiciones: 'abd91e51-5a38-44f3-9318-274179873aa2',
  entrevistas:   '90863e4b-b09f-42cf-89b9-1557025cdb8c',
  roles:         'd278cf7f-18ed-40d2-9912-4c4c65942f0c',
  psicometrias:  '4218256f-3afc-4f16-8eab-6617fcdf1735',
  referencias:   '5b919593-ddee-40a7-aeb4-91d6e94b215b',
};
