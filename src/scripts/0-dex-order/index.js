import { DEX_LIST_CODE } from "./dex_list.js";

const dexOrderModule = {
  id: "dex-order",
  title: "- 캐릭터 민첩 리스트 출력",
  category: "전투",
  command: "!dex-order",
  description: "플레이어블 캐릭터의 모든 민첩을 높은순에서 낮은순으로 나열합니다. 모두의 민첩이 같을시엔 근접전 기능치로 리스트를 나열합니다.",
  code: DEX_LIST_CODE
};

export default dexOrderModule;
