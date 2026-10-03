import datetime as dt
import math

import numpy as np
import pandas as pd


def jsonable(o):
    """Recursively convert numpy/pandas values (NaN, NaT, Timestamp...) into JSON-safe values."""
    if o is None or o is pd.NaT or o is pd.NA:
        return None
    if isinstance(o, dict):
        return {str(k): jsonable(v) for k, v in o.items()}
    if isinstance(o, pd.DataFrame):
        return jsonable(o.to_dict("records"))
    if isinstance(o, pd.Series):
        return jsonable(o.tolist())
    if isinstance(o, (list, tuple, set, np.ndarray)):
        return [jsonable(v) for v in o]
    if isinstance(o, (bool, np.bool_)):
        return bool(o)
    if isinstance(o, (int, np.integer)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        f = float(o)
        return None if math.isnan(f) or math.isinf(f) else f
    if isinstance(o, (pd.Timestamp, dt.datetime, dt.date)):
        return o.isoformat()[:10]
    return o