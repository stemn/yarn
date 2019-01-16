const initJaegerTracer = require("jaeger-client").initTracer;

// basic logging Tracer
export function initTracer(serviceName: string) {

  const config = {
    serviceName: serviceName,
    sampler: {
      type: "const",
      param: 1,
    },
    reporter: {
      logSpans: true,
    },
  };
  const options = {
    logger: {
      info(msg) {
        console.error(`INFO ${msg} [${serviceName}] [${process.pid}]`);
      },
      error(msg) {
        console.error("ERROR", msg);
      },
    },
  };
  return initJaegerTracer(config, options);
}


export function getTracer(): Object {
  return main_tracer;
}

export function setTracer(tracer: Object) {
  main_tracer = tracer;
}

export function closeTracer() {
  console.error("CLOSING TRACER");
  main_tracer.close();
}

export function statusTracer() {
  console.error(main_tracer);
}

export var main_tracer = initTracer("yarn");

