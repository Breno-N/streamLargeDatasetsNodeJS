require('dotenv').config();

const express = require('express');
const servidor = express();
const sql = require('mssql');

let configDb = { 
    server: process.env.SERVER,
    database : process.env.DATABASE,
    user : process.env.USER,
    password : process.env.PASSWORD,
    connectionTimeout: process.env.CON_TIMEOUT,
    requestTimeout: process.env.REQ_TIMEOUT,
    pool: {
        idleTimeoutMillis: process.env.IDLE_TIMEOUT,
        max: process.env.MAX_POOL
    },
    options : {
        enableArithAbort : false,
        encrypt: false
    }
};

function executaQuery(req, res){
    
        const pool = new sql.ConnectionPool(configDb);
            
        const poolConnect = pool.connect();

        poolConnect.then((pool) => {

			const request = pool.request();

            request.stream = true;
            
            let params = null;

			if(params){

				params.map((param) => {

					let tipo;

					switch(typeof param.valor) {
						case "number":
							tipo = sql.Int;
							break;
						case "boolean":
							tipo = sql.Bit;
							break;
						default:
							tipo = sql.NVarChar;
					}

					request[param.tipo](param.campo, tipo, param.valor);
				});
            }
            
            let query = `QUERY QUE RETORNE MILHARES DE RESULTADOS`;

			request.query(query);

            const BATCH_SIZE = 500;

			let rowCount = 0;

			request.on('recordset', () => {
				res.setHeader('Cache-Control', 'no-cache');
				res.setHeader('Content-Type', 'application/json');
				res.write('{"dados":[');
			});

			request.on('row', row => {

				if (rowCount > 0){
					res.write(',');
				}

				if (rowCount % BATCH_SIZE === 0){
					res.flushHeaders();
				}

				res.write(JSON.stringify(row));

				rowCount++;
			});

			request.on('done', () => {
				res.write('],"mensagem":"OK","sucesso":true}');
				sql.close();
				res.end();
			});
	
			request.on('error', console.log);
        })
        .catch(err => {
            console.log(err.message);
            sql.close();
            res.end();
        });
};

servidor.use(express.urlencoded({ extended: true }));

servidor.use(express.json({limit: '50mb', type:'application/json'}));

servidor.get('/teste', executaQuery);

servidor.listen(3000, () => console.log('Servidor iniciado na porta 3000'));