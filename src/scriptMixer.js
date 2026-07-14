export const SCRIPT_MODULES = [
  {
    id: "bigside",
    title: "-토큰 이미지 리스트 확인",
    category: "토큰",
    command: "!bigside / !bigside-set",
    description: "선택한 다면 토큰의 이미지 목록을 GM에게 보여주고, 선택한 이미지로 변경합니다.",
    code: `const SG_BIGSIDE = (() => {
  const openCommand = "!bigside";
  const setCommand = "!bigside-set";

  function handle(msg) {
    if (msg.type !== "api") return;
    if (!playerIsGM(msg.playerid)) return;

    if (msg.content === openCommand) {
      const token = getSelectedToken(msg);

      if (!token) {
        sendChat("BigSide", "/w gm 토큰을 하나 선택한 뒤 !bigside 를 입력하세요.");
        return;
      }

      const sides = getTokenSides(token);

      if (!sides.length) {
        sendChat("BigSide", "/w gm 선택한 토큰에 등록된 이미지 목록이 없습니다.");
        return;
      }

      sendChat("BigSide", "/w gm " + renderSidePicker(token.id, sides));
      return;
    }

    if (msg.content.startsWith(setCommand)) {
      const parts = msg.content.split(/\\s+/);
      const tokenId = parts[1];
      const sideIndex = Number(parts[2]);
      const token = getObj("graphic", tokenId);

      if (!token || !Number.isInteger(sideIndex)) {
        sendChat("BigSide", "/w gm 사용법: !bigside-set 토큰ID 번호");
        return;
      }

      const sides = getTokenSides(token);
      const imgsrc = sides[sideIndex];

      if (!imgsrc) {
        sendChat("BigSide", "/w gm 해당 번호의 이미지가 없습니다.");
        return;
      }

      token.set({
        currentSide: sideIndex,
        imgsrc
      });
    }
  }

  function getSelectedToken(msg) {
    const tokenId = msg.selected && msg.selected[0] && msg.selected[0]._id;
    return tokenId ? getObj("graphic", tokenId) : null;
  }

  function getTokenSides(token) {
    return String(token.get("sides") || "")
      .split("|")
      .map((side) => decodeURIComponent(side))
      .filter(Boolean);
  }

  function renderSidePicker(tokenId, sides) {
    const rows = sides
      .map((side, index) => {
        const image = htmlEscape(side);
        const command = "!bigside-set " + tokenId + " " + index;

        return [
          "<tr>",
          "<td><img src=\\"" + image + "\\" style=\\"width:64px;height:64px;object-fit:cover;border:1px solid #bbb;\\" /></td>",
          "<td><a href=\\"" + command + "\\">" + (index + 1) + "번 이미지로 변경</a></td>",
          "</tr>"
        ].join("");
      })
      .join("");

    return [
      "<div style=\\"background:#fff;border:1px solid #ccc;padding:8px;\\">",
      "<strong>토큰 이미지 리스트 확인하기</strong>",
      "<table style=\\"margin-top:6px;border-collapse:collapse;\\">",
      rows,
      "</table>",
      "</div>"
    ].join("");
  }

  function htmlEscape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  on("chat:message", handle);
})();`
  }
];

export function getSelectedModules(selected = {}) {
  return SCRIPT_MODULES.filter((module) => selected[module.id]);
}

export function buildMixedScript(selected = {}) {
  return getSelectedModules(selected)
    .map((module) => module.code)
    .join("\\n\\n");
}
