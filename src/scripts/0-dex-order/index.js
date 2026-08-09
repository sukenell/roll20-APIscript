import { DEX_LIST_CODE } from "./dex_list.js";

const dexOrderModule = {
  id: "dex-order",
  title: "- 캐릭터 특성치 순서 출력",
  category: "전투",
  command: "!dex-order / !pow-order / !con-order",
  description:
    "캐릭터의 민첩, 정신력, 건강을 높은 순서로 나열합니다. " +
    "값이 모두 같으면 전투 기능치 순서를 사용합니다. 추가 캐릭터 " +
    "명단을 함께 출력하며, 명령어와 현재 명단은 핸드아웃에 " +
    "자동으로 기록합니다.",
  code: DEX_LIST_CODE
};

export default dexOrderModule;
