import "./style.css";
import {
  InjectedClientProvider,
  RedClient,
  RedUiElement,
  registerRedUiElement,
} from "@reddb-io/ui/embed";

registerRedUiElement();

const host = document.querySelector<RedUiElement>("#red-ui");
const endpointInput = document.querySelector<HTMLInputElement>("#endpoint");
const tokenInput = document.querySelector<HTMLInputElement>("#token");
const mountButton = document.querySelector<HTMLButtonElement>("#mount");
const workspaces = document.querySelector<HTMLElement>("#workspaces")!;
const addButton = document.querySelector<HTMLButtonElement>("#add-workspace")!;

if (!host || !endpointInput || !tokenInput || !mountButton) {
  throw new Error("Embed host DOM is incomplete");
}

const redUiHost = host;
const endpoint = endpointInput;
const token = tokenInput;
const mount = mountButton;

function providerFromHostInputs(label = "Host-owned auth") {
  const endpointUrl = endpoint.value.trim();
  const authToken = token.value.trim();
  const client = new RedClient(endpointUrl, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  return new InjectedClientProvider({
    client,
    connection: {
      id: "host-auth",
      label,
      url: endpointUrl,
      role: "primary",
      description: "ConnectionProvider constructed by the host application.",
    },
  });
}

function mountFromHostAuth() {
  const panel = document.querySelector<HTMLElement>(
    '[data-workspace-panel="1"]'
  )!;
  if (!redUiHost.isConnected) panel.append(redUiHost);
  redUiHost.initialRoute = "/collections";
  redUiHost.theme = "dark";
  redUiHost.connectionProvider = providerFromHostInputs();
}

let nextWorkspace = 2;
addButton.addEventListener("click", () => {
  const number = nextWorkspace++;
  const panel = document.createElement("section");
  panel.dataset.workspacePanel = String(number);
  const remove = document.createElement("button");
  remove.textContent = `Remove workspace ${number}`;
  remove.addEventListener("click", () => panel.remove());
  const additional = document.createElement("red-ui-app") as RedUiElement;
  additional.id = `red-ui-${number}`;
  additional.initialRoute = "/collections";
  additional.theme = "light";
  additional.connectionProvider = providerFromHostInputs(`Workspace ${number}`);
  panel.append(remove, additional);
  workspaces.append(panel);
});
document
  .querySelector("#remove-first")!
  .addEventListener("click", () => redUiHost.remove());

mount.addEventListener("click", mountFromHostAuth);
mountFromHostAuth();
