const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const KEY = "rbxgarden_v3";

const DEFAULT_SCRIPT = `--!strict
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player: Player)
    print(("Bem-vindo, %s!"):format(player.Name))
end)`;

const MODULES = [
  {
    id:"datastore", icon:"💾", name:"DataStoreService Wrapper", category:"Data",
    tags:["datastore","save","profile","server"],
    desc:"Camada modular para GetAsync/SetAsync/UpdateAsync com cache, retry e pontos de extensão.",
    code:`--!strict
local DataStoreService = game:GetService("DataStoreService")

local Store = DataStoreService:GetDataStore("PlayerData_v1")

local DataService = {}
DataService.Default = {
    Coins = 0,
    Level = 1,
    Inventory = {},
}

function DataService:GetKey(player: Player): string
    return "Player_" .. player.UserId
end

function DataService:Load(player: Player)
    local key = self:GetKey(player)
    local ok, data = pcall(function()
        return Store:GetAsync(key)
    end)

    if ok and type(data) == "table" then
        return data
    end

    return table.clone(self.Default)
end

function DataService:Save(player: Player, data)
    local key = self:GetKey(player)
    local ok, err = pcall(function()
        Store:UpdateAsync(key, function()
            return data
        end)
    end)

    if not ok then
        warn("Data save failed:", player.Name, err)
    end

    return ok
end

return DataService`
  },
  {
    id:"remotes",icon:"📡",name:"RemoteBridge",category:"Network",
    tags:["remote","network","client","server"],
    desc:"Criação organizada de RemoteEvent/RemoteFunction em uma pasta dedicada.",
    code:`--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local folder = ReplicatedStorage:FindFirstChild("Remotes")
if not folder then
    folder = Instance.new("Folder")
    folder.Name = "Remotes"
    folder.Parent = ReplicatedStorage
end

local RemoteBridge = {}

function RemoteBridge:GetEvent(name: string): RemoteEvent
    local item = folder:FindFirstChild(name)
    if item and item:IsA("RemoteEvent") then
        return item
    end

    local event = Instance.new("RemoteEvent")
    event.Name = name
    event.Parent = folder
    return event
end

function RemoteBridge:GetFunction(name: string): RemoteFunction
    local item = folder:FindFirstChild(name)
    if item and item:IsA("RemoteFunction") then
        return item
    end

    local fn = Instance.new("RemoteFunction")
    fn.Name = name
    fn.Parent = folder
    return fn
end

return RemoteBridge`
  },
  {
    id:"playerdata",icon:"🧑",name:"PlayerData Cache",category:"Player",
    tags:["player","cache","data","attributes"],
    desc:"Cache simples por UserId para centralizar estado de sessão do jogador.",
    code:`--!strict
local PlayerData = {}
local sessions: {[number]: {[string]: any}} = {}

function PlayerData:Create(player: Player, initial)
    sessions[player.UserId] = initial or {}
    return sessions[player.UserId]
end

function PlayerData:Get(player: Player)
    return sessions[player.UserId]
end

function PlayerData:Remove(player: Player)
    sessions[player.UserId] = nil
end

function PlayerData:Set(player: Player, key: string, value: any)
    local data = sessions[player.UserId]
    if not data then
        return false
    end
    data[key] = value
    return true
end

return PlayerData`
  },
  {
    id:"cleanup",icon:"🧹",name:"CleanupStack",category:"Utility",
    tags:["cleanup","connections","instances","utility"],
    desc:"Pequena estrutura para guardar RBXScriptConnection e objetos e limpar tudo no fim.",
    code:`local Cleanup = {}
Cleanup.__index = Cleanup

function Cleanup.new()
    return setmetatable({items = {}}, Cleanup)
end

function Cleanup:Add(item)
    table.insert(self.items, item)
    return item
end

function Cleanup:Destroy()
    for _, item in ipairs(self.items) do
        local kind = typeof(item)

        if kind == "RBXScriptConnection" then
            item:Disconnect()
        elseif typeof(item) == "Instance" then
            item:Destroy()
        elseif type(item) == "function" then
            item()
        elseif type(item) == "table" and item.Destroy then
            item:Destroy()
        end
    end

    table.clear(self.items)
end

return Cleanup`
  },
  {
    id:"number",icon:"🔢",name:"BigNumber",category:"Utility",
    tags:["numbers","incremental","format","economy"],
    desc:"Formatador de números para jogos incrementais e economias com valores grandes.",
    code:`local BigNumber = {}

function BigNumber.Format(n: number): string
    local suffixes = {"", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"}
    local i = 1

    while math.abs(n) >= 1000 and i < #suffixes do
        n /= 1000
        i += 1
    end

    if i == 1 then
        return tostring(math.floor(n))
    end

    return string.format("%.2f%s", n, suffixes[i])
end

return BigNumber`
  },
  {
    id:"signal",icon:"📣",name:"Signal",category:"Utility",
    tags:["signal","events","modules","communication"],
    desc:"Evento local entre módulos sem precisar espalhar BindableEvents.",
    code:`local Signal = {}
Signal.__index = Signal

function Signal.new()
    return setmetatable({listeners = {}}, Signal)
end

function Signal:Connect(callback)
    local connection = {Connected = true, Callback = callback}
    table.insert(self.listeners, connection)

    function connection:Disconnect()
        self.Connected = false
    end

    return connection
end

function Signal:Fire(...)
    for _, listener in self.listeners do
        if listener.Connected then
            task.spawn(listener.Callback, ...)
        end
    end
end

function Signal:Destroy()
    table.clear(self.listeners)
end

return Signal`
  },
  {
    id:"cooldown",icon:"⏱️",name:"CooldownService",category:"Gameplay",
    tags:["cooldown","skills","combat","abilities"],
    desc:"Cooldowns por jogador e chave, com API simples para skills e ações.",
    code:`local CooldownService = {}
local active = {}

function CooldownService:Use(player: Player, key: string, duration: number): boolean
    active[player] = active[player] or {}

    if active[player][key] then
        return false
    end

    active[player][key] = true
    task.delay(duration, function()
        if active[player] then
            active[player][key] = nil
        end
    end)

    return true
end

function CooldownService:IsCooling(player: Player, key: string): boolean
    return active[player] and active[player][key] == true or false
end

return CooldownService`
  },
  {
    id:"inventory",icon:"🎒",name:"InventoryService",category:"Gameplay",
    tags:["inventory","items","data","economy"],
    desc:"Estrutura básica e extensível para inventário server-side.",
    code:`local InventoryService = {}

function InventoryService:Add(inventory, itemId: string, amount: number?)
    inventory[itemId] = (inventory[itemId] or 0) + (amount or 1)
end

function InventoryService:Remove(inventory, itemId: string, amount: number?)
    local current = inventory[itemId] or 0
    local take = amount or 1

    if current < take then
        return false
    end

    inventory[itemId] = current - take

    if inventory[itemId] <= 0 then
        inventory[itemId] = nil
    end

    return true
end

function InventoryService:Has(inventory, itemId: string, amount: number?): boolean
    return (inventory[itemId] or 0) >= (amount or 1)
end

return InventoryService`
  },
  {
    id:"ui",icon:"🎨",name:"UIController",category:"UI",
    tags:["ui","gui","tween","animation"],
    desc:"Controlador simples para abrir/fechar interfaces e centralizar ações visuais.",
    code:`local TweenService = game:GetService("TweenService")

local UIController = {}

function UIController:Open(frame: GuiObject)
    frame.Visible = true
    frame.Position = UDim2.fromScale(0.5, 0.54)

    TweenService:Create(
        frame,
        TweenInfo.new(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
        {Position = UDim2.fromScale(0.5, 0.5)}
    ):Play()
end

function UIController:Close(frame: GuiObject)
    local tween = TweenService:Create(
        frame,
        TweenInfo.new(0.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
        {Position = UDim2.fromScale(0.5, 0.54)}
    )

    tween.Completed:Once(function()
        frame.Visible = false
    end)

    tween:Play()
end

return UIController`
  },
  {
    id:"service",icon:"🧰",name:"ServiceLocator",category:"Utility",
    tags:["services","architecture","modules","bootstrap"],
    desc:"Padrão de acesso centralizado para seus módulos e serviços internos.",
    code:`local ServiceLocator = {}
local services = {}

function ServiceLocator:Register(name: string, service)
    assert(services[name] == nil, "Service already registered: " .. name)
    services[name] = service
end

function ServiceLocator:Get(name: string)
    local service = services[name]
    assert(service ~= nil, "Unknown service: " .. name)
    return service
end

function ServiceLocator:Has(name: string): boolean
    return services[name] ~= nil
end

return ServiceLocator`
  }
];

const DOCS = [
  {id:"intro",title:"Começando",html:`
    <h2>Começando com Luau</h2>
    <p>Luau é a linguagem de script usada pelos criadores no Roblox. Ela deriva do Lua 5.1 e adiciona recursos como tipagem gradual, interpolação de strings e iteração generalizada de tabelas.</p>
    <div class="callout"><b>Ideia central:</b> aprenda primeiro a linguagem e, em seguida, o modelo de objetos/serviços do Roblox. Seu código fica mais fácil de escalar quando essas duas camadas estão bem separadas.</div>
    <pre>print("Olá, Roblox!")

local coins = 100
local playerName = "Bernardo"
print(\`Jogador: {playerName} | Coins: {coins}\`)</pre>
    <h3>O ciclo básico</h3>
    <p>Um projeto Roblox normalmente combina Scripts no servidor, LocalScripts no cliente e ModuleScripts para compartilhar lógica e organizar sistemas.</p>`},
  {id:"variables",title:"Variáveis",html:`
    <h2>Variáveis e escopo</h2>
    <p>Prefira <code>local</code> para evitar globais desnecessárias. O escopo local ajuda a reduzir efeitos colaterais e torna módulos mais previsíveis.</p>
    <pre>local coins = 250
local playerName = "Builder"
local online = true
local nothing = nil

local function printPlayer()
    print(playerName, coins, online)
end

printPlayer()</pre>
    <h3>Boas bases</h3>
    <p>Use nomes que descrevem intenção, concentre estado em tabelas quando necessário e evite mutar dados globais sem motivo.</p>`},
  {id:"types",title:"Tipos",html:`
    <h2>Tipos e annotations</h2>
    <p>Luau é gradualmente tipado: você pode começar sem annotations e adicioná-las onde elas aumentam segurança e clareza.</p>
    <pre>local coins: number = 100
local playerName: string = "Builder"
local alive: boolean = true

local function addCoins(amount: number): number
    coins += amount
    return coins
end</pre>
    <h3>Modos de análise</h3>
    <p><code>--!nocheck</code> desativa a verificação, <code>--!nonstrict</code> é menos permissivo apenas em tipos anotados e <code>--!strict</code> pede verificação mais ampla.</p>
    <div class="callout">Para sistemas grandes, experimente <b>--!strict</b> e crie tipos compartilhados em ModuleScripts.</div>`},
  {id:"functions",title:"Funções",html:`
    <h2>Funções</h2>
    <p>Funções encapsulam comportamento e são a principal unidade de reutilização.</p>
    <pre>local function add(a: number, b: number): number
    return a + b
end

local result = add(10, 25)

local function greet(name: string)
    print(\`Olá, {name}!\`)
end

greet("Builder")</pre>
    <h3>Métodos com self</h3>
    <pre>local Counter = {}
Counter.__index = Counter

function Counter.new()
    return setmetatable({Value = 0}, Counter)
end

function Counter:Add(amount: number)
    self.Value += amount
end</pre>`},
  {id:"conditions",title:"Condições",html:`
    <h2>Condições</h2>
    <p>Use <code>if</code>, <code>elseif</code> e <code>else</code> para decisões.</p>
    <pre>local coins = 150

if coins >= 100 then
    print("Pode comprar")
elseif coins > 0 then
    print("Tem algumas coins")
else
    print("Sem coins")
end

local allowed = coins >= 100 and true or false</pre>`},
  {id:"loops",title:"Loops",html:`
    <h2>Loops e iteração</h2>
    <pre>for i = 1, 5 do
    print(i)
end

local players = game:GetService("Players")

for _, player in players:GetPlayers() do
    print(player.Name)
end

while task.wait(1) do
    print("tick")
end</pre>
    <p>Em servidores Roblox, pense sempre sobre frequência e condição de saída para não criar trabalho desnecessário.</p>`},
  {id:"tables",title:"Tables",html:`
    <h2>Tables</h2>
    <p>Tables podem representar listas, dicionários e estruturas de dados.</p>
    <pre>local fruits = {"Apple", "Pear", "Mango"}

local playerData = {
    Coins = 100,
    Level = 5,
    Inventory = {"Sword", "Potion"},
}

table.insert(fruits, "Banana")

for index, fruit in fruits do
    print(index, fruit)
end

print(playerData.Coins)</pre>`},
  {id:"vectors",title:"Vector3 e CFrame",html:`
    <h2>Vetores e transformações Roblox</h2>
    <p>Em Roblox, vetores são essenciais para posição, direção e velocidade. <code>Vector3</code> possui X, Y e Z. <code>CFrame</code> representa posição e orientação.</p>
    <pre>local part = workspace.Part

local direction = Vector3.new(0, 1, 0)
part.Position += direction * 5

local target = CFrame.new(0, 5, -10)
part.CFrame = target</pre>
    <h3>Exemplo de direção</h3>
    <pre>local offset = targetPart.Position - part.Position
local distance = offset.Magnitude
local direction = offset.Unit</pre>`},
  {id:"events",title:"Events",html:`
    <h2>Eventos</h2>
    <p>Roblox usa sinais para reagir a acontecimentos. Conectar uma função é uma das operações mais comuns em scripts.</p>
    <pre>local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    print("Entrou:", player.Name)
end)

local part = workspace.Part

part.Touched:Connect(function(hit)
    print("Tocou:", hit.Name)
end)</pre>
    <div class="callout">Guarde conexões quando o ciclo de vida do objeto for importante. Uma estrutura de cleanup pode evitar conexões esquecidas.</div>`},
  {id:"modules",title:"ModuleScripts",html:`
    <h2>ModuleScripts</h2>
    <p>Um ModuleScript normalmente retorna uma tabela, função ou outro valor. Eles são ideais para separar configurações, utilitários e serviços.</p>
    <pre>-- ModuleScript
local MoneyService = {}

function MoneyService:Add(data, amount)
    data.Coins += amount
end

return MoneyService

-- outro Script
local MoneyService = require(path.To.MoneyService)
MoneyService:Add(playerData, 50)</pre>
    <h3>Arquitetura recomendada</h3>
    <p>Use módulos para domínio, configuração e serviços. Deixe o Script de bootstrap inicializar o sistema, em vez de espalhar lógica idêntica em muitos lugares.</p>`},
  {id:"clientserver",title:"Cliente x servidor",html:`
    <h2>Cliente x servidor</h2>
    <p>O servidor deve ser a autoridade para regras importantes do jogo, como moeda, inventário, dano e persistência. O cliente é ótimo para input, interface e efeitos locais.</p>
    <pre>-- Server
RemoteEvent.OnServerEvent:Connect(function(player, action)
    -- valide player, action e todos os valores recebidos
end)

-- Client
RemoteEvent:FireServer("OpenShop")</pre>
    <div class="callout"><b>Regra prática:</b> nunca confie em valores enviados pelo cliente só porque a interface diz que eles são válidos.</div>`},
  {id:"remotes",title:"RemoteEvent",html:`
    <h2>RemoteEvent</h2>
    <p><code>RemoteEvent</code> permite comunicação assíncrona de mão única entre cliente e servidor. É comum colocá-lo em <code>ReplicatedStorage</code> para ambos os lados acessarem.</p>
    <pre>-- client
ShopRemote:FireServer("Buy", "Potion", 1)

-- server
ShopRemote.OnServerEvent:Connect(function(player, action, itemId, amount)
    if action ~= "Buy" then return end
    -- valide tudo antes de executar
end)</pre>`},
  {id:"datastore",title:"DataStore",html:`
    <h2>DataStoreService</h2>
    <p><code>DataStoreService</code> é usado para persistir dados entre sessões. Uma camada própria costuma ser útil para padronizar chaves, retries, cache, schema e tratamento de erros.</p>
    <pre>local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("PlayerData_v1")

local ok, value = pcall(function()
    return store:GetAsync("Player_" .. player.UserId)
end)</pre>
    <h3>Studio</h3>
    <p>Ao testar DataStores no Studio, o acesso precisa ser habilitado nas configurações apropriadas. Tenha cuidado para não misturar testes com os dados de produção.</p>`},
  {id:"metatables",title:"Metatables",html:`
    <h2>Metatables e objetos</h2>
    <p>Metatables permitem definir comportamentos especiais para tabelas. Um padrão comum é usar <code>__index</code> para construir objetos baseados em protótipos.</p>
    <pre>local Pet = {}
Pet.__index = Pet

function Pet.new(name: string)
    return setmetatable({
        Name = name,
        Level = 1,
    }, Pet)
end

function Pet:LevelUp()
    self.Level += 1
end</pre>`},
  {id:"generics",title:"Generics",html:`
    <h2>Generics</h2>
    <p>Generics tornam funções e tipos reutilizáveis em várias formas de dados.</p>
    <pre>type State<T> = {
    Key: string,
    Value: T,
}

local function createState<T>(key: string, value: T): State<T>
    return {
        Key = key,
        Value = value,
    }
end

local coins = createState("Coins", 0)
local enabled = createState("Enabled", true)</pre>
    <h3>Export type</h3>
    <pre>-- Types Module
export type PlayerProfile = {
    Coins: number,
    Level: number,
}

-- outro ModuleScript
local Types = require(path.Types)
local profile: Types.PlayerProfile = {
    Coins = 0,
    Level = 1,
}</pre>`},
  {id:"strings",title:"Strings",html:`
    <h2>Strings e interpolação</h2>
    <p>Luau possui interpolação com crases, útil para mensagens e UI sem precisar concatenar tudo manualmente.</p>
    <pre>local player = "Builder"
local level = 12

print(\`{player} chegou ao nível {level}.\`)</pre>
    <p>Para estruturas grandes, mantenha formatação próxima do lugar onde o texto é produzido e evite misturar lógica de negócio com UI.</p>`},
  {id:"performance",title:"Performance",html:`
    <h2>Performance</h2>
    <p>Comece com código claro e meça antes de otimizar. Evite loops apertados desnecessários, buscas repetitivas na hierarquia e criação excessiva de conexões/instâncias.</p>
    <pre>-- melhor: recupere uma vez
local Players = game:GetService("Players")

local function countPlayers()
    return #Players:GetPlayers()
end</pre>
    <div class="callout">O Script Editor do Roblox fornece autocomplete, análise de script e diagnóstico em tempo real. Use essas ferramentas junto com testes e profiling.</div>`}
];
