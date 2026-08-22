import './popup.css';
import { INSTALL_URL, type ExtensionResponse, type PopupStatus } from '../shared/protocol';

const toggle = document.querySelector<HTMLInputElement>('#sharing-toggle');
const badge = document.querySelector<HTMLElement>('#sharing-badge');
const connectorStatus = document.querySelector<HTMLElement>('#connector-status');
const discordStatus = document.querySelector<HTMLElement>('#discord-status');
const statusError = document.querySelector<HTMLElement>('#status-error');
const installButton = document.querySelector<HTMLButtonElement>('#install');
const refreshButton = document.querySelector<HTMLButtonElement>('#refresh');

const textStatus = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const render = (status: PopupStatus): void => {
  if (!toggle || !badge || !connectorStatus || !discordStatus || !statusError || !installButton) {
    return;
  }
  toggle.checked = status.sharingEnabled;
  badge.textContent = status.sharingEnabled ? 'Enabled' : 'Disabled';
  badge.className = `badge ${status.sharingEnabled ? 'badge-on' : 'badge-off'}`;
  connectorStatus.textContent = textStatus(status.connector);
  discordStatus.textContent = textStatus(status.discord);
  statusError.textContent = status.lastError ?? '';
  statusError.hidden = !status.lastError;
  installButton.hidden = status.connector === 'available';
};

const send = (message: unknown): Promise<ExtensionResponse> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: unknown) => {
      resolve(
        (response as ExtensionResponse | undefined) ?? {
          ok: false,
          error: 'No response from extension.',
        },
      );
    });
  });

const load = async (): Promise<void> => {
  const response = await send({ type: 'popup_get_status' });
  if (response.status) {
    render(response.status);
  }
};

const refresh = async (): Promise<void> => {
  await send({ type: 'refresh_content' });
  await load();
};

toggle?.addEventListener('change', async () => {
  if (!toggle) {
    return;
  }
  const response = await send({ type: 'set_sharing', enabled: toggle.checked });
  if (response.status) {
    render(response.status);
  }
});

installButton?.addEventListener('click', () => {
  void chrome.tabs.create({ url: INSTALL_URL });
});

refreshButton?.addEventListener('click', () => {
  void refresh();
});

void load();
