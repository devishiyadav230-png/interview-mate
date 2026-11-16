"""Body-language analysis with MediaPipe Pose + OpenCV + NumPy."""
import base64
import math
import threading

import cv2
import mediapipe as mp
import numpy as np

PL = mp.solutions.pose.PoseLandmark
_pose = mp.solutions.pose.Pose(static_image_mode=True, model_complexity=1,
                                min_detection_confidence=0.5)
_lock = threading.Lock()   # MediaPipe objects are not thread-safe
_prev = {}                 # session id -> previous grayscale frame (for motion)


def _decode(data_url):
    raw = base64.b64decode(data_url.split(",", 1)[-1])
    return cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)


def _pt(lm, i):
    p = lm[i]
    return np.array([p.x, p.y]), p.visibility


def _tilt(a, b):
    d = b - a
    ang = abs(math.degrees(math.atan2(d[1], d[0])))
    return float(min(ang, 180 - ang))


def analyze_frame(session, data_url):
    """Return posture / motion / lighting metrics for ONE video frame."""
    img = _decode(data_url)
    if img is None:
        return {"pose": False}
    gray = cv2.resize(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (64, 48)).astype(np.float32)
    prev = _prev.get(session)
    if len(_prev) > 200:
        _prev.clear()
    _prev[session] = gray
    out = {"pose": False, "brightness": float(gray.mean()),
        "motion": float(np.abs(gray - prev).mean()) if prev is not None else None}

    with _lock:
        res = _pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    if not res.pose_landmarks:
        return out
    lm = res.pose_landmarks.landmark
    ls, vl = _pt(lm, PL.LEFT_SHOULDER)
    rs, vr = _pt(lm, PL.RIGHT_SHOULDER)
    if min(vl, vr) < 0.5:
        return out
    nose, _ = _pt(lm, PL.NOSE)
    le, _ = _pt(lm, PL.LEFT_EAR)
    re, _ = _pt(lm, PL.RIGHT_EAR)
    sw = max(abs(ls[0] - rs[0]), 1e-3)
    mid = (ls + rs) / 2
    hand_face = False
    for w in (PL.LEFT_WRIST, PL.RIGHT_WRIST):
        p, v = _pt(lm, w)
        if v > 0.5 and np.linalg.norm(p - nose) < 0.45 * sw:
            hand_face = True
    out.update(pose=True, shoulder_tilt=_tilt(ls, rs), head_tilt=_tilt(le, re),
            head_height=float((mid[1] - nose[1]) / sw),
            head_turn=float(abs(nose[0] - mid[0]) / sw),
            offset=float(mid[0] - 0.5), width=float(sw),
            hand_face=hand_face, nose=[float(nose[0]), float(nose[1])])
    return out


def summarize(frames):
    """Turn the per-frame metrics of one answer into a score and tips."""
    n = len(frames)
    if n < 3:
        return None
    P = [f for f in frames if f.get("pose")]
    m = lambda xs: float(np.mean(xs)) if len(xs) else 0.0
    mv = m([f["motion"] for f in frames if f.get("motion") is not None])
    br = m([f["brightness"] for f in frames if "brightness" in f])
    tips, sc = [], 100

    if mv < 1.2:
        sc -= 10; tips.append("You looked very still. Relax your shoulders and use natural hand gestures.")
    elif mv > 6:
        sc -= min(30, int((mv - 6) * 5)); tips.append("A lot of movement detected (fidgeting or swaying). Sit steady and keep your hands calm.")
    if br < 70:
        sc -= 12; tips.append("The video is dark. Face a window or lamp so your face is clearly visible.")
    elif br > 200:
        sc -= 8; tips.append("The video is overexposed. Reduce harsh light on or behind you.")

    vis = len(P) / n
    head_move = 0.0
    if vis < 0.6:
        sc -= int((1 - vis) * 30)
        tips.append("Your head and shoulders were not clearly visible %d%% of the time. Sit so your upper body is in frame." % round((1 - vis) * 100))
    if len(P) >= 3:
        if m([f["shoulder_tilt"] for f in P]) > 6:
            sc -= 8; tips.append("Your shoulders look uneven. Sit square to the camera.")
        if m([f["head_tilt"] for f in P]) > 10:
            sc -= 5; tips.append("Your head is tilted. Keep it level to look confident.")
        if m([f["head_height"] for f in P]) < 0.42:
            sc -= 12; tips.append("You may be slouching or leaning forward. Sit upright, chest open, chin level.")
        if m([f["head_turn"] for f in P]) > 0.35:
            sc -= 10; tips.append("You were often looking away from the camera. Look at the lens as if it is the interviewer.")
        if abs(m([f["offset"] for f in P])) > 0.2:
            sc -= 6; tips.append("Centre yourself in the frame.")
        w = m([f["width"] for f in P])
        if w < 0.22:
            sc -= 6; tips.append("You are sitting too far from the camera.")
        elif w > 0.75:
            sc -= 6; tips.append("You are too close to the camera.")
        if m([1.0 if f["hand_face"] else 0.0 for f in P]) > 0.25:
            sc -= 8; tips.append("Your hand was near your face often. Avoid touching your face or mouth while speaking.")
        head_move = float(np.std(np.array([f["nose"] for f in P]), axis=0).mean() / max(w, 1e-3))
        if head_move > 0.12:
            sc -= 6; tips.append("Your head moved a lot. Try to keep it steady while speaking.")
    if not tips:
        tips.append("Great posture and presence. Keep it up!")
    calm = max(0, min(100, int(100 - max(0, mv - 3) * 9 - max(0, head_move - 0.08) * 120)))
    return {"sc": max(0, sc), "calm": calm, "tips": tips,
            "stats": {"motion": round(mv, 2), "brightness": round(br, 1), "pose_visible": round(vis, 2)}}
