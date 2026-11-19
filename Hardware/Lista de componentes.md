
# ⚙️ FlexMotion — Lista de Componentes

> Relação dos componentes eletrônicos e materiais utilizados no desenvolvimento do FlexMotion, sistema de monitoramento de movimentos baseado em ESP32 e sensor flexível.

---

## 🔌 Componentes eletrônicos

| Componente | Quantidade | Função |
|:---|:---:|:---|
| ESP32 DevKit V1 | 1 | Unidade de processamento e comunicação Wi-Fi |
| Sensor Flexível (Flex Sensor) | 1 | Detectar variações de curvatura |
| Resistor | 1 | Compor o circuito divisor de tensão do sensor |
| Protoboard | 1 | Montagem e conexão do circuito |
| Jumpers | Conforme necessário | Realizar as conexões elétricas |

---

## 🌐 Comunicação e conectividade

| Recurso | Tecnologia | Finalidade |
|:---|:---|:---|
| Comunicação sem fio | Wi-Fi | Conectar o ESP32 à rede |
| Protocolo de comunicação | MQTT | Transmitir os dados do sensor |
| Broker MQTT | HiveMQ Cloud | Gerenciar a comunicação entre dispositivos |

---

## 💻 Tecnologias de desenvolvimento

| Tecnologia | Aplicação |
|:---|:---|
| C++ | Programação do ESP32 |
| HTML | Estrutura da interface web |
| CSS | Estilização da interface |
| JavaScript | Funcionalidades e atualização dos dados |
| Arduino IDE | Desenvolvimento e gravação do firmware |

---

## 📐 Documentação técnica

| Arquivo | Descrição |
|:---|:---|
| `diagrama-eletrico.png` | Representação das conexões elétricas |
| `../firmware/` | Código-fonte do ESP32 |
| `../website/` | Arquivos da interface web |
| `../docs/artigo.pdf` | Documentação científica do projeto |

---

## 🔧 Observações

- As quantidades devem ser atualizadas conforme a montagem definitiva.
- Os componentes devem ser conectados de acordo com o diagrama elétrico.
- A ESP32 é responsável pela leitura e processamento dos dados do sensor.
- A comunicação MQTT permite o envio das informações para o sistema web.

---

<p align="center">
  **FlexMotion**
  <br>
  <sub>Integração entre hardware, software e Internet das Coisas (IoT).</sub>
</p>
