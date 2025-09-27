type SuccessResponse = {
  date: string;
};

type ErrorResponse = {
  error: string;
  message: string;
};

type WorkdaysQuery = {
  date?: string;
  days?: string;
  hours?: string;
};

type WorkdaysResponse = SuccessResponse | ErrorResponse;
