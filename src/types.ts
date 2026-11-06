export type Character={id:string;name:string;age:number;persona:string;goal:string;secret:string;mood:string};
export type Message={id:string;role:'user'|'assistant';text:string;created:number};
export type Relationship={trust:number;attraction:number;affinity:number;intimacy:number;tension:number};
export type Story={id:string;name:string;scene:string;time:string;chars:Character[];rel:Record<string,Relationship>;facts:string[];summary:string;messages:Message[];updated:number};
