# TechFlow — Documentação da API REST

**Projeto:** TechFlow — Sistema de Gerenciamento de Ordens de Serviço  
**Versão da API:** 1.0 — Desenvolvimento  
**Tecnologias:** Node.js, Express, MySQL, BCrypt e JWT  
**Formato de comunicação:** JSON

---

## 1. Apresentação

A API do TechFlow é responsável por gerenciar os dados e as operações do sistema de assistência técnica.

Ela permite cadastrar clientes, técnicos, equipamentos, categorias, tipos de serviço e Ordens de Serviço, além de controlar os atendimentos, seus históricos e as permissões dos usuários.

A API segue o padrão REST e utiliza métodos HTTP para realizar operações no banco de dados MySQL.

## 2. Configuração

### Endereço base

Durante o desenvolvimento local, o servidor utiliza:

`http://localhost:3000`

Os endpoints utilizam o prefixo `/api`.

### Inicialização

Dentro da pasta `backend`, execute:

```bash
npm install
node server.js
```

O terminal deverá apresentar:

```text
Servidor rodando em http://localhost:3000
```

### Variáveis de ambiente

O arquivo `.env` contém as configurações sensíveis do sistema:

- `DB_PASSWORD`: senha da conexão MySQL.
- `JWT_SECRET`: chave utilizada para assinar e verificar tokens JWT.

O `.env` não deve ser enviado ao GitHub.

## 3. Autenticação e autorização

O TechFlow possui três perfis de usuário:

| Perfil | Responsabilidade |
|---|---|
| Administrador | Gerenciamento geral do sistema |
| Técnico | Atendimento das OS atribuídas |
| Cliente | Solicitação e acompanhamento dos próprios serviços |

A autenticação utiliza JWT, com validade de uma hora.

Para acessar endpoints protegidos, é necessário enviar o cabeçalho:

```http
Authorization: Bearer SEU_TOKEN_JWT
```

### 3.1 Login

**Endpoint:** `POST /api/auth/login`

**Autenticação:** Pública

**Corpo da requisição:**

```json
{
  "email": "usuario@exemplo.com",
  "senha": "SenhaDeExemplo123"
}
```

**Resposta de sucesso — HTTP 200:**

```json
{
  "mensagem": "Login realizado com sucesso!",
  "token": "TOKEN_JWT_GERADO",
  "usuario": {
    "idUsuario": 3,
    "nomeCompleto": "Maria Teste",
    "email": "usuario@exemplo.com",
    "perfil": "cliente"
  }
}
```

**Possíveis erros:**

| HTTP | Situação |
|---|---|
| 400 | E-mail ou senha não informado |
| 401 | Credenciais incorretas |
| 403 | Conta desativada |
| 423 | Conta temporariamente bloqueada |
| 429 | Excesso de requisições de login |
| 500 | Erro interno ou autenticação não configurada |

### 3.2 Regras de segurança

- As senhas são armazenadas utilizando BCrypt.
- Cinco tentativas incorretas consecutivas bloqueiam a conta por 15 minutos.
- Um login correto reinicia o contador de tentativas.
- O limite por IP é de 10 requisições de login a cada 15 minutos.
- Tokens inválidos ou expirados são recusados.
- Usuários desativados não podem acessar endpoints protegidos.
- Os hashes das senhas não são retornados nas consultas cadastrais.

## 4. Clientes

**Endereço base:** `/api/clientes`

| Método | Endpoint | Permissão | Descrição |
|---|---|---|---|
| GET | `/api/clientes` | Administrador | Listar todos os clientes |
| GET | `/api/clientes/:id` | Administrador ou próprio cliente | Consultar cliente |
| POST | `/api/clientes` | Público | Cadastrar cliente |
| PUT | `/api/clientes/:id` | Administrador ou próprio cliente | Atualizar cadastro |
| PATCH | `/api/clientes/:id/desativar` | Administrador | Desativar cliente |
| PATCH | `/api/clientes/:id/reativar` | Administrador | Reativar cliente |

### Cadastrar cliente

**Endpoint:** `POST /api/clientes`

**Corpo da requisição:**

```json
{
  "nomeCompleto": "Cliente Exemplo",
  "cpf": "CPF_VALIDO_NAO_CADASTRADO",
  "email": "cliente@exemplo.com",
  "telefone": "11999999999",
  "endereco": "Endereço do cliente",
  "senha": "SenhaForte123"
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Cliente cadastrado com sucesso!",
  "idCliente": 8
}
```

O ID apresentado é ilustrativo. O número real é gerado automaticamente pelo MySQL.

**Regras importantes:**

- CPF e e-mail não podem estar duplicados.
- O perfil é definido obrigatoriamente como `cliente`.
- O CPF não é alterado pelo endpoint de atualização.
- Um cliente não pode acessar o cadastro de outro cliente.
- A desativação preserva o cadastro no banco de dados.

## 5. Técnicos

**Endereço base:** `/api/tecnicos`

Todas as operações exigem perfil de administrador.

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/tecnicos` | Listar técnicos |
| GET | `/api/tecnicos/:id` | Consultar técnico |
| POST | `/api/tecnicos` | Cadastrar técnico |
| PUT | `/api/tecnicos/:id` | Atualizar técnico |
| PATCH | `/api/tecnicos/:id/desativar` | Desativar técnico |
| PATCH | `/api/tecnicos/:id/reativar` | Reativar técnico |

### Cadastrar técnico

**Endpoint:** `POST /api/tecnicos`

```json
{
  "nomeCompleto": "Técnico Exemplo",
  "cpf": "CPF_VALIDO_NAO_CADASTRADO",
  "email": "tecnico@exemplo.com",
  "telefone": "11999999999",
  "endereco": "Endereço de exemplo",
  "senha": "SenhaForte123"
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Técnico cadastrado com sucesso!",
  "idTecnico": 9
}
```

**Regras importantes:**

- Somente administradores podem cadastrar técnicos.
- O CPF é validado antes da inserção.
- As senhas são protegidas com BCrypt.
- O perfil é definido como `tecnico`.
- O cadastro pode ser desativado ou reativado.
- A atualização não permite alterar diretamente o perfil ou o CPF.

## 6. Equipamentos

**Endereço base:** `/api/equipamentos`

| Método | Endpoint | Permissão |
|---|---|---|
| GET | `/api/equipamentos` | Administrador e cliente |
| GET | `/api/equipamentos/:id` | Administrador ou proprietário |
| POST | `/api/equipamentos` | Administrador e cliente |
| PUT | `/api/equipamentos/:id` | Administrador ou proprietário |
| PATCH | `/api/equipamentos/:id/desativar` | Administrador ou proprietário |
| PATCH | `/api/equipamentos/:id/reativar` | Administrador ou proprietário |

### Cadastrar equipamento

**Endpoint:** `POST /api/equipamentos`

```json
{
  "idCliente": 3,
  "idCategoria": 1,
  "nomeEquipamento": "Notebook",
  "marca": "Dell",
  "modelo": "Inspiron 15"
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Equipamento cadastrado com sucesso!",
  "idEquipamento": 3
}
```

**Regras importantes:**

- O equipamento deve pertencer a um cliente ativo.
- A categoria informada deve estar ativa.
- Clientes só podem cadastrar equipamentos para si mesmos.
- Clientes não podem consultar equipamentos de outros clientes.
- A atualização não permite transferir a propriedade.
- Equipamentos são desativados em vez de excluídos definitivamente.

## 7. Categorias de equipamentos

**Endereço base:** `/api/categorias`

| Método | Endpoint | Permissão |
|---|---|---|
| GET | `/api/categorias` | Administrador e cliente |
| GET | `/api/categorias/:id` | Administrador e cliente |
| POST | `/api/categorias` | Administrador |
| PUT | `/api/categorias/:id` | Administrador |
| PATCH | `/api/categorias/:id/desativar` | Administrador |
| PATCH | `/api/categorias/:id/reativar` | Administrador |

### Cadastrar categoria

**Endpoint:** `POST /api/categorias`

```json
{
  "nomeCategoria": "Celulares",
  "descricao": "Smartphones e aparelhos celulares"
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Categoria cadastrada com sucesso!",
  "idCategoria": 2
}
```

**Regras importantes:**

- O nome da categoria é obrigatório e deve ser único.
- Somente administradores podem modificar categorias.
- Clientes visualizam somente categorias ativas.
- A desativação não exclui a categoria do MySQL.
- Categorias inativas não podem ser utilizadas no cadastro de novos equipamentos.

## 8. Tipos de serviço

**Endereço base:** `/api/tipos-servico`

| Método | Endpoint | Permissão |
|---|---|---|
| GET | `/api/tipos-servico` | Administrador e cliente |
| GET | `/api/tipos-servico/:id` | Administrador e cliente |
| POST | `/api/tipos-servico` | Administrador |
| PUT | `/api/tipos-servico/:id` | Administrador |
| PATCH | `/api/tipos-servico/:id/desativar` | Administrador |
| PATCH | `/api/tipos-servico/:id/reativar` | Administrador |

### Cadastrar tipo de serviço

**Endpoint:** `POST /api/tipos-servico`

```json
{
  "nomeServico": "Troca de Tela",
  "descricao": "Substituição de telas danificadas"
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Tipo de serviço cadastrado com sucesso!",
  "idTipoServico": 2
}
```

**Regras importantes:**

- O nome do serviço é obrigatório e deve ser único.
- Somente administradores podem cadastrar e alterar serviços.
- Clientes visualizam somente serviços ativos.
- Serviços inativos não podem ser utilizados na abertura de novas OS.
- A desativação preserva os vínculos históricos com Ordens de Serviço.

## 9. Ordens de Serviço

**Endereço base:** `/api/ordens-servico`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/ordens-servico` | Listar OS permitidas ao usuário |
| GET | `/api/ordens-servico/:id` | Consultar uma OS |
| POST | `/api/ordens-servico` | Abrir uma OS |
| PUT | `/api/ordens-servico/:id` | Atualizar a descrição |
| PATCH | `/api/ordens-servico/:id/status` | Alterar o status |
| PATCH | `/api/ordens-servico/:id/diagnostico` | Registrar diagnóstico e solução |
| PATCH | `/api/ordens-servico/:id/cancelar` | Cancelar uma OS |

### 9.1 Abrir Ordem de Serviço

**Endpoint:** `POST /api/ordens-servico`

**Permissão:** Administrador ou cliente proprietário.

```json
{
  "idCliente": 3,
  "idEquipamento": 2,
  "idTipoServico": 1,
  "descricaoProblema": "Notebook não liga."
}
```

**Resposta — HTTP 201:**

```json
{
  "mensagem": "Ordem de Serviço cadastrada com sucesso!",
  "idOS": 5
}
```

A OS é criada com status `Aberta`.

O sistema registra também sua abertura na tabela `HistoricoStatus`.

### 9.2 Atualizar descrição

**Endpoint:** `PUT /api/ordens-servico/:id`

**Permissão:** Administrador ou cliente proprietário.

```json
{
  "descricaoProblema": "Notebook não liga e não acende nenhuma luz."
}
```

A alteração é permitida enquanto a OS não estiver concluída ou cancelada.

### 9.3 Registrar diagnóstico

**Endpoint:** `PATCH /api/ordens-servico/:id/diagnostico`

**Permissão:** Administrador ou técnico atribuído.

```json
{
  "diagnostico": "Falha no circuito de alimentação.",
  "solucaoAplicada": "Reparo no circuito de alimentação."
}
```

**Resposta de sucesso:**

```json
{
  "mensagem": "Diagnóstico e solução registrados com sucesso!"
}
```

Clientes não podem registrar diagnósticos técnicos.

### 9.4 Alterar status

**Endpoint:** `PATCH /api/ordens-servico/:id/status`

**Permissão:** Administrador ou técnico atribuído.

```json
{
  "novoStatus": "Em andamento"
}
```

**Resposta:**

```json
{
  "mensagem": "Status atualizado com sucesso!",
  "statusAnterior": "Aberta",
  "novoStatus": "Em andamento"
}
```

**Status disponíveis no sistema:**

| Status | Significado |
|---|---|
| Aberta | Solicitação cadastrada |
| Em análise | Equipamento em avaliação |
| Em andamento | Serviço em execução |
| Aguardando peça | Atendimento aguardando componente |
| Concluída | Serviço finalizado |
| Cancelada | Solicitação cancelada |

A criação define automaticamente o status `Aberta`. A mudança para `Cancelada` possui endpoint próprio.

Para concluir uma OS, é obrigatório registrar o diagnóstico e a solução aplicada.

Ordens concluídas ou canceladas não podem ter seu status alterado pelo endpoint atual.

### 9.5 Cancelar uma OS

**Endpoint:** `PATCH /api/ordens-servico/:id/cancelar`

**Permissão:** Administrador ou cliente proprietário.

```json
{
  "justificativa": "Cliente desistiu do serviço."
}
```

**Resposta:**

```json
{
  "mensagem": "OS cancelada e histórico registrado!"
}
```

O cancelamento somente é permitido quando a OS está `Aberta` ou `Em análise`.

A justificativa é obrigatória.

## 10. Histórico das Ordens de Serviço

**Endpoint:** `GET /api/ordens-servico/:id/historico`

**Permissão:**

- Administrador: qualquer OS.
- Técnico: OS atribuída a ele.
- Cliente: OS de sua propriedade.

**Exemplo de resposta:**

```json
[
  {
    "idHistorico": 1,
    "idOS": 4,
    "statusAnterior": null,
    "statusNovo": "Aberta",
    "dataAlteracao": "2026-11-03T10:00:00.000Z"
  },
  {
    "idHistorico": 2,
    "idOS": 4,
    "statusAnterior": "Aberta",
    "statusNovo": "Em andamento",
    "dataAlteracao": "2026-11-03T11:00:00.000Z"
  }
]
```

Os identificadores e horários acima são ilustrativos.

O histórico permite acompanhar a evolução do atendimento, mantendo registrados os status anteriores e os novos status.

## 11. Atribuição de técnicos

**Endpoint:** `PATCH /api/ordens-servico/:id/atribuir`

**Permissão:** Somente administrador.

**Corpo da requisição:**

```json
{
  "idTecnico": 2
}
```

**Resposta:**

```json
{
  "mensagem": "Técnico atribuído com sucesso!",
  "idOS": 5,
  "idTecnico": 2
}
```

**Regras importantes:**

- O técnico deve existir e estar ativo.
- A OS deve existir e não estar concluída ou cancelada.
- Atribuições repetidas do mesmo técnico são recusadas.
- O administrador pode substituir o responsável.
- A atribuição é registrada em `HistoricoAtribuicoes`.
- Técnicos e clientes não podem atribuir responsáveis.

## 12. Permissões gerais

| Funcionalidade | Administrador | Técnico | Cliente |
|---|---|---|---|
| Gerenciar clientes | Sim | Não | Próprio cadastro |
| Gerenciar técnicos | Sim | Não | Não |
| Gerenciar equipamentos | Todos | Não | Próprios |
| Consultar categorias | Todas | Não | Ativas |
| Gerenciar categorias | Sim | Não | Não |
| Consultar tipos de serviço | Todos | Não | Ativos |
| Gerenciar tipos de serviço | Sim | Não | Não |
| Consultar OS | Todas | Atribuídas | Próprias |
| Abrir OS | Sim | Não | Próprias |
| Registrar diagnóstico | Sim | Atribuídas | Não |
| Alterar status | Sim | Atribuídas | Não |
| Cancelar OS | Sim | Não | Próprias, conforme status |
| Atribuir técnicos | Sim | Não | Não |
| Consultar histórico de OS | Todas | Atribuídas | Próprias |

## 13. Códigos HTTP utilizados

| Código | Significado |
|---|---|
| 200 | Requisição realizada com sucesso |
| 201 | Registro criado com sucesso |
| 400 | Dados inválidos ou operação não permitida pelo estado do registro |
| 401 | Usuário não autenticado ou credenciais inválidas |
| 403 | Acesso proibido |
| 404 | Registro ou rota não encontrado |
| 409 | Conflito, geralmente por cadastro duplicado |
| 423 | Conta temporariamente bloqueada |
| 429 | Limite de requisições excedido |
| 500 | Erro interno do servidor |

Os códigos e mensagens podem variar conforme a rota e o tipo de validação.

## 14. Exemplo de consumo da API

O exemplo utiliza JavaScript e a API Fetch.

```javascript
async function consultarEquipamentos(token) {
    const resposta = await fetch(
        "http://localhost:3000/api/equipamentos",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!resposta.ok) {
        throw new Error("Erro ao consultar equipamentos.");
    }

    return await resposta.json();
}
```

Esse exemplo poderá ser utilizado futuramente na integração do front-end do TechFlow.

## 15. Estrutura principal do back-end

```text
backend/
├── database/
│   └── conexao.js
├── middlewares/
│   ├── verificarToken.js
│   └── verificarPerfil.js
├── routes/
│   ├── autenticacao.js
│   ├── clientes.js
│   ├── tecnicos.js
│   ├── equipamentos.js
│   ├── categorias.js
│   ├── tiposServico.js
│   ├── ordensServico.js
│   ├── atribuicoes.js
│   └── historicoOS.js
├── utils/
│   └── validacoes.js
├── .env
├── package.json
├── server.js
└── API.md
```

## 16. Observações e melhorias futuras

Esta documentação descreve a API implementada na fase atual de desenvolvimento.

Antes de disponibilizar o sistema em produção, será necessário revisar a configuração de HTTPS, as variáveis de ambiente, o controle de requisições em ambientes com múltiplos servidores, a consistência de horários e os testes automatizados.

Também poderão ser acrescentadas funcionalidades como recuperação de senha, paginação de consultas, filtros avançados e documentação OpenAPI/Swagger.

---

**TechFlow — Sistema de Gerenciamento de Ordens de Serviço**

Documentação técnica da API REST — Sprint 2.