// Bank metadata lives beside (never inside) characters in the existing collection.
// A single localStorage replacement commits the vault and character together.
export const DEVICE_BANK_KEY='__runalisDeviceBank';
export function decodeProfileCollection(raw){
 const collection=JSON.parse(raw)||{};
 if(typeof collection!=='object'||Array.isArray(collection))throw Error('Invalid profile collection.');
 delete collection[DEVICE_BANK_KEY];return collection;
}
export function encodeProfileCollection(profiles,raw,bank){
 const stored=JSON.parse(raw)||{};
 if(typeof stored!=='object'||Array.isArray(stored))throw Error('Invalid profile collection.');
 const vault=bank===undefined?stored[DEVICE_BANK_KEY]:bank;
 return JSON.stringify({...profiles,...(vault?{[DEVICE_BANK_KEY]:vault}:{})});
}
export function decodeDeviceBank(raw){
 const stored=JSON.parse(raw)||{},bank=stored[DEVICE_BANK_KEY];
 if(!bank)return {version:1,gold:0,items:[],revision:0};
 if(bank.version!==1||!Number.isSafeInteger(bank.gold)||bank.gold<0||!Array.isArray(bank.items)||!Number.isSafeInteger(bank.revision))throw Error('Bank storage is unreadable.');
 return structuredClone(bank);
}
